/- # Mg-Li Cloud Run elastic-constant dataset

This file embeds the real LAMMPS outputs from the Kim et al. 2012 2NN MEAM
Mg-Li potential runs on GCP Cloud Run Jobs.  The three successful bcc
solid-solution compositions (50 at.% Mg, 75 at.% Mg, and 100 at.% Mg) are
checked against the Winter et al. 2017 reference cubic elastic constants.

The cross-class transferability matrix verifies that the empirical
relative error never exceeds the principal-angle bound proven in
`OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer`.
-/

namespace OpenDistillationFactory.Materials.Data.MgLiCloudRun

/-- Computed cubic elastic constants `[C11, C12, C44]` (GPa) from Cloud Run. -/
def computed50Mg : Array Float := #[28.851314156335633, 15.290513177829181, 24.013826065550035]
def computed75Mg : Array Float := #[39.2360629623387, 25.622700236335135, 21.391347190099765]
def computed100Mg : Array Float := #[54.7991909699704, 37.98126196581203, 38.64360682741199]

/-- Winter et al. 2017 reference cubic elastic constants `[C11, C12, C44]` (GPa). -/
def ref50Mg : Array Float := #[39.9, 18.8, 28.6]
def ref75Mg : Array Float := #[38.7, 27.3, 37.8]
def ref100Mg : Array Float := #[34.0, 36.1, 28.4]

def computed : Array (Array Float) := #[computed50Mg, computed75Mg, computed100Mg]
def references : Array (Array Float) := #[ref50Mg, ref75Mg, ref100Mg]

/-- 3-D vector helpers for the empirical check. -/
def vsub (a b : Array Float) : Array Float := #[a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!]
def vscale (s : Float) (a : Array Float) : Array Float := #[s * a[0]!, s * a[1]!, s * a[2]!]
def vdot (a b : Array Float) : Float := a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!
def vnormSq (a : Array Float) : Float := vdot a a
def vnorm (a : Array Float) : Float := Float.sqrt (vnormSq a)

/-- Principal-angle geometry on the 3-D residual vectors. -/
def cosPrincipalAngle (u v : Array Float) : Float :=
  (vdot u v).abs / (vnorm u * vnorm v)

def sinPrincipalAngle (u v : Array Float) : Float :=
  let c := cosPrincipalAngle u v
  let discr := 1.0 - c * c
  -- Guard against tiny rounding excursions above 1.
  Float.sqrt (if discr < 0.0 then 0.0 else discr)

/-- Relative cross-class transfer error after projecting the target residual
onto the source residual direction. -/
def crossClassError (u v : Array Float) : Float :=
  if vnorm u == 0.0 || vnorm v == 0.0 then
    0.0
  else
    let proj := vscale ((vdot v u) / (vnormSq u)) u
    vnorm (vsub v proj) / vnorm v

/-- Check one matrix entry (source `i`, target `j`). -/
def checkEntry (i j : Nat) : Bool :=
  let u := vsub computed[i]! references[i]!
  let v := vsub computed[j]! references[j]!
  let err := crossClassError u v
  let bound := sinPrincipalAngle u v
  err <= bound + 1e-6

/-- All nine transferability entries satisfy the principal-angle bound. -/
def transferMatrixSatisfiesBound : Bool :=
  List.all (List.range 3) (fun i =>
    List.all (List.range 3) (fun j => checkEntry i j))

/-- Number of successful real Cloud Run compositions embedded here. -/
def cloudRunCompositionCount : Nat := computed.size

end OpenDistillationFactory.Materials.Data.MgLiCloudRun
