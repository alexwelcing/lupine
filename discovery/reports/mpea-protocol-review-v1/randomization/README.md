# Exact permutation primitive — synthetic design work only

This scratch component implements integer arithmetic and records an explicitly
supplied byte callback. It has no entropy acquisition, data/cache reader,
production allocation, command-line entry point or role-assignment rule. No
actual opaque group IDs or OS entropy were used in development or testing.
It is separate from any future source-bound entry point that might reserve
groups or assign training/calibration/evaluation roles.

## API

`factorial_unrank(sorted_ids, index)` returns the index-th lexicographic
permutation. `factorial_rank(sorted_ids, permutation)` is its inverse.
`sample_permutation(sorted_ids, byte_source)` returns a frozen
`AllocationReceipt`. The callback is mandatory and is invoked as
`byte_source(requested_bytes)`; there is no default provider.

The universe must be a list or tuple of 2 through 64 strictly increasing,
distinct identifiers. Identifiers are homogeneous exact Python integers
(booleans excluded), or homogeneous nonempty exact strings. Strings use Python
code-point order; no trimming, case folding, Unicode normalization, chemistry
normalization or identifier conversion occurs. The original identifiers are
snapshotted into an immutable tuple before the provider can run. Sizes zero
and one are explicitly rejected rather than assigning ambiguous zero-bit roles.
The proposed 40-group use would supply opaque numeric group IDs; this generic
helper does not read or establish their provenance.

Let `N = n!`, `k = (N - 1).bit_length()`, and `b = ceil(k/8)`.
Each request returns **exactly `b` bytes**. Interpret them as an unsigned
big-endian integer and keep the low `k` bits with mask `2**k - 1`. Accept only
`index < N`; otherwise request another draw. There is no modulo-`N` reduction.
For 40 IDs this is 20 bytes and a 160-bit mask, so no received bits are dropped.
At most 128 provider calls occur, including invalid/exception attempts. The
first accepted index ends sampling immediately.

The factoradic convention is fixed: at each remaining length `m`, divide the
residual index by `(m-1)!`; remove the quotient-positioned ID from the ascending
remaining list, then continue with the remainder. Rank zero is original order;
rank `n!-1` is reverse order. Rank sums these same quotient positions times
their corresponding factorial weights.

## Receipt and failure contract

Receipts and draw records are frozen dataclasses whose sequence fields are
tuples. The receipt contains original IDs, `N`, `k`, `b`, the fixed cap, and
ordered draw records. Every valid returned byte string is preserved exactly as
lowercase hex, along with its masked index and accepted/rejected disposition.
SUCCESS means only that an in-range index was selected by the stated procedure.
It contains the exact accepted index and permutation.

BLOCKED receipts contain neither an accepted index nor a partial permutation.
The 128-rejection failure preserves all 128 draws. A provider exception or
invalid returned type/length stops immediately, retaining all preceding valid
draws and one constant error-coded attempt record. Invalid returned objects are
not serialized; an exact `bytes` object of the wrong length contributes its
length only, without its content or a partial masked index. Callback exception
messages are not copied. Validation errors before sampling raise and make zero
provider calls. Process termination, `KeyboardInterrupt` and native failures are
not converted into an independently durable receipt by this in-memory helper.

Both `uniform_byte_source_attested` and
`physical_independence_established` are always false in function-produced
receipts. A deterministic fixture can return SUCCESS; that does not make its
draw uniform. There is no receipt verifier or cryptographic authenticity claim
here. A later production adapter must separately bind the universe, mechanism,
source implementation, entropy custody and failure preservation before use.
Its mathematical premise remains conditional/assumed unless established by
separate evidence; an unsupported law must not be promoted into a guarantee.

The size bound limits factorial/permutation work and the call count. It does
not bound the time or memory used inside an arbitrary injected provider or the
storage size of caller-supplied integer/string identifiers.

## Conditional finite-law argument

Assume each requested `b`-byte string is uniform over all `256**b` strings and
independent of previous strings. Each low-`k` integer has exactly
`2**(8*b-k)` preimages, hence is uniform over `K = 2**k` possibilities.
For any allowed index `j`, the probability that draw `t` is its first acceptance
is

`((K-N)/K)**(t-1) / K`.

This is independent of `j`. Summing for `t=1,...,128` and conditioning on
completion gives probability exactly `1/N` for each allowed index. Completion
has probability `1-((K-N)/K)**128`; the capped failure event produces no
allocation. Since `N > K/2`, its probability is less than `2**-128` (zero when
`N=K`). This conclusion is conditional on independent uniform supplied bytes,
not an entropy-source attestation. It does not apply to arbitrary correlated,
biased, failing or deterministic callbacks.

The lexicographic rank/unrank bijection follows by induction: each first-ID
choice occupies a distinct block of `(n-1)!` indices, and the quotient/remainder
choose exactly one block and one recursively ordered suffix. Combining the
bijection with the conditional uniform index gives a uniform finite
permutation, conditional on completion. Neither statement establishes physical
sample independence, group validity, population coverage, model quality or a
data-driven eligibility rule.

The tests exhaust all 46,232 permutations for sizes 2 through 8, test boundary
indices at sizes 40 and 64, exhaust the 256 one-byte inputs for sizes 2/3/4,
and exercise forced rejection, last-draw acceptance, cap failure, malformed
provider results, input validation and immutable exact identifiers. These are
finite executable checks plus the explicit argument above, not a Lean theorem
or proof that a particular real entropy source satisfies the premise.
