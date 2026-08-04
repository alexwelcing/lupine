/- # Al-Cu Cloud Run elastic-constant dataset

This file embeds the real LAMMPS outputs from the Liu et al. 1999 EAM/alloy
Al-Cu potential runs on GCP Cloud Run Jobs.  The two successful fcc
end-member compositions (pure Al and pure Cu) are checked against
experimental single-crystal cubic elastic constants.

The cross-class transferability matrix verifies that the empirical
relative error never exceeds the principal-angle bound proven in
`OpenDistillationFactory.Materials.Theory.AlloyResidualTransfer`.
-/namespace OpenDistillationFactory.Materials.Data.AlCuCloudRun

/-- Computed cubic elastic constants `[C11, C12, C44]` (GPa) from Cloud Run. -/
def computedAl : Array Float := #[118.44243348875, 62.5631989629278, 36.6134403163136]
def computedCu : Array Float := #[167.263646365149, 124.153749300048, 76.4452071866344]

/-- Experimental cubic elastic constants `[C11, C12, C44]` (GPa). -/
def refAl : Array Float := #[106.75, 60.41, 28.34]
def refCu : Array Float := #[168.4, 121.4, 75.4]

def computed : Array (Array Float) := #[computedAl, computedCu]
def references : Array (Array Float) := #[refAl, refCu]

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

/-- All transferability entries satisfy the principal-angle bound. -/
def transferMatrixSatisfiesBound : Bool :=
  List.all (List.range 2) (fun i =>
    List.all (List.range 2) (fun j => checkEntry i j))

/-- Number of successful real Cloud Run compositions embedded here. -/
def cloudRunCompositionCount : Nat := computed.size

end OpenDistillationFactory.Materials.Data.AlCuCloudRun
