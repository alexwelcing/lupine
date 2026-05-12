//! OIDC verification for Cloud Tasks → Cloud Run.
//!
//! Cloud Tasks signs each HTTP target invocation with a Google-issued ID token.
//! We verify the JWT against Google's JWKS, check `iss`, `exp`, and require
//! `aud` to match this service's URL (`SERVICE_URL` env var, configured at boot
//! by Cloud Run / by the operator).

use std::collections::HashMap;
use std::sync::RwLock;

use anyhow::{anyhow, bail, Context};
use axum::async_trait;
use axum::http::HeaderMap;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

const GOOGLE_JWKS_URL: &str = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISS_HTTPS: &str = "https://accounts.google.com";
const GOOGLE_ISS_BARE: &str = "accounts.google.com";

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Claims {
    pub iss: String,
    pub aud: String,
    pub sub: String,
    pub exp: usize,
    #[serde(default)]
    pub email: Option<String>,
}

#[async_trait]
pub trait OidcVerifier: Send + Sync {
    async fn verify(&self, token: &str, expected_aud: Option<&str>) -> anyhow::Result<Claims>;
}

/// Dev mode: accept any non-empty token without checking it.
pub struct DevModeVerifier;

#[async_trait]
impl OidcVerifier for DevModeVerifier {
    async fn verify(&self, _token: &str, _expected_aud: Option<&str>) -> anyhow::Result<Claims> {
        Ok(Claims {
            iss: "dev-mode".into(),
            aud: "dev-mode".into(),
            sub: "dev-mode".into(),
            exp: 0,
            email: None,
        })
    }
}

#[derive(Deserialize)]
struct Jwk {
    kid: String,
    n: String,
    e: String,
    #[serde(rename = "use")]
    _use: Option<String>,
    #[serde(rename = "kty")]
    _kty: Option<String>,
}

#[derive(Deserialize)]
struct Jwks {
    keys: Vec<Jwk>,
}

pub struct GoogleJwksVerifier {
    keys: RwLock<HashMap<String, DecodingKey>>,
}

impl GoogleJwksVerifier {
    pub async fn new() -> anyhow::Result<Self> {
        let v = Self {
            keys: RwLock::new(HashMap::new()),
        };
        v.refresh().await?;
        Ok(v)
    }

    async fn refresh(&self) -> anyhow::Result<()> {
        let jwks: Jwks = reqwest::Client::new()
            .get(GOOGLE_JWKS_URL)
            .send()
            .await
            .context("fetching Google JWKS")?
            .error_for_status()
            .context("JWKS response not 2xx")?
            .json()
            .await
            .context("parsing JWKS")?;
        let mut map = HashMap::with_capacity(jwks.keys.len());
        for k in jwks.keys {
            let dk = DecodingKey::from_rsa_components(&k.n, &k.e)
                .with_context(|| format!("decoding key kid={}", k.kid))?;
            map.insert(k.kid, dk);
        }
        let mut guard = self
            .keys
            .write()
            .map_err(|_| anyhow!("jwks lock poisoned"))?;
        *guard = map;
        Ok(())
    }

    fn lookup(&self, kid: &str) -> Option<DecodingKey> {
        self.keys.read().ok()?.get(kid).cloned()
    }
}

#[async_trait]
impl OidcVerifier for GoogleJwksVerifier {
    async fn verify(&self, token: &str, expected_aud: Option<&str>) -> anyhow::Result<Claims> {
        let header = decode_header(token).context("decoding JWT header")?;
        let kid = header.kid.ok_or_else(|| anyhow!("JWT missing kid"))?;

        let key = match self.lookup(&kid) {
            Some(k) => k,
            None => {
                self.refresh().await?;
                self.lookup(&kid)
                    .ok_or_else(|| anyhow!("kid {kid} not found after JWKS refresh"))?
            }
        };

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_issuer(&[GOOGLE_ISS_HTTPS, GOOGLE_ISS_BARE]);
        if let Some(aud) = expected_aud {
            validation.set_audience(&[aud]);
        } else {
            // No SERVICE_URL configured — leave audience unchecked rather than
            // accepting all tokens silently. Caller must set SERVICE_URL in prod.
            validation.validate_aud = false;
        }
        let data = decode::<Claims>(token, &key, &validation).context("JWT decode/verify")?;
        Ok(data.claims)
    }
}

pub async fn verify_oidc(
    verifier: &dyn OidcVerifier,
    headers: &HeaderMap,
    expected_aud: Option<&str>,
) -> anyhow::Result<Claims> {
    let auth = headers
        .get("authorization")
        .ok_or_else(|| anyhow!("missing Authorization header"))?
        .to_str()
        .map_err(|_| anyhow!("non-ASCII Authorization header"))?;

    let token = auth
        .strip_prefix("Bearer ")
        .or_else(|| auth.strip_prefix("bearer "))
        .ok_or_else(|| anyhow!("Authorization is not a Bearer token"))?
        .trim();

    if token.is_empty() {
        bail!("empty bearer token");
    }

    verifier.verify(token, expected_aud).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[tokio::test]
    async fn dev_verifier_accepts() {
        let v = DevModeVerifier;
        let c = v.verify("anything", Some("aud")).await.unwrap();
        assert_eq!(c.sub, "dev-mode");
    }

    #[tokio::test]
    async fn rejects_missing_auth_header() {
        let v = DevModeVerifier;
        let h = HeaderMap::new();
        let err = verify_oidc(&v, &h, None).await.unwrap_err();
        assert!(err.to_string().contains("missing Authorization"));
    }

    #[tokio::test]
    async fn rejects_non_bearer() {
        let v = DevModeVerifier;
        let mut h = HeaderMap::new();
        h.insert("authorization", HeaderValue::from_static("Basic abc"));
        let err = verify_oidc(&v, &h, None).await.unwrap_err();
        assert!(err.to_string().contains("not a Bearer token"));
    }

    #[tokio::test]
    async fn rejects_empty_bearer() {
        let v = DevModeVerifier;
        let mut h = HeaderMap::new();
        h.insert("authorization", HeaderValue::from_static("Bearer "));
        let err = verify_oidc(&v, &h, None).await.unwrap_err();
        assert!(err.to_string().contains("empty bearer"));
    }

    #[tokio::test]
    async fn accepts_valid_bearer_in_dev() {
        let v = DevModeVerifier;
        let mut h = HeaderMap::new();
        h.insert(
            "authorization",
            HeaderValue::from_static("Bearer eyJhbGciOi"),
        );
        let c = verify_oidc(&v, &h, Some("aud")).await.unwrap();
        assert_eq!(c.iss, "dev-mode");
    }
}
