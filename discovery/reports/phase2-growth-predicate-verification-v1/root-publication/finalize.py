from pathlib import Path
import datetime,hashlib,json,re,subprocess
R=Path.cwd(); H=R/'.cache/phase2-growth-predicate-verification-release-v1'; D=R/'reports/phase2-growth-predicate-verification-v1'
sha=lambda b:hashlib.sha256(b).hexdigest()
now=datetime.datetime.now(datetime.timezone.utc).isoformat()
base='a064a2c0e4a7cce1fbcb0541f49aae132944e785'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==base
mapping=json.loads((H/'initial-copy-map.json').read_bytes())['files']
for p,m in mapping.items():assert sha((R/p).read_bytes())==m['sha256'],p
review=R/'.cache/phase2-growth-predicate-actual-review-v1'
assert sha((review/'actual-handoff.json').read_bytes())=='39966eac5360defff0f2ed49372f08cf62230a4e17215b547e3726e0acf5d441'
assert sha((review/'inventory.json').read_bytes())=='22070322facb64c0d2064fbb9f3c326c16998d9993aa359cc218fa46f8d390d1'
inv=json.loads((review/'inventory.json').read_bytes())
for p,m in inv['files'].items():assert sha((review/p).read_bytes())==m['sha256']
for p in list(inv['files'])+['inventory.json','actual-handoff.json']:
 src=review/p;dst=D/'actual-review'/p;dst.parent.mkdir(parents=True,exist_ok=True);assert not dst.exists();dst.write_bytes(src.read_bytes());mapping[str(dst.relative_to(R))]={'source':str(src.relative_to(R)),'bytes':src.stat().st_size,'sha256':sha(src.read_bytes())}
for p in ['pr-verified-complete.json','pr-body-complete.json']:
 src=R/'.cache/phase2-growth-predicate-release-v1'/p;dst=D/'publication'/p
 assert src.exists() and not dst.exists();dst.write_bytes(src.read_bytes());mapping[str(dst.relative_to(R))]={'source':str(src.relative_to(R)),'bytes':src.stat().st_size,'sha256':sha(src.read_bytes())}
(D/'ROOT-CHECKPOINT.md').write_text('''# Completed header audit and source-readiness checkpoint

Implementation `a064a2c0e4a7cce1fbcb0541f49aae132944e785` passed all four
original push jobs in [CI 38901590399](https://github.com/alexwelcing/lupine/actions/runs/38901590399),
observed at 12:56:39 UTC. The [exact CI receipt](implementation-ci.json),
[clean package and independent artifact review](README.md), and
[completed draft PR observation](publication/pr-verified-complete.json) bind that
implementation. The installed package passes 28 demonstrations, six schemas and
16 mandatory checks, followed by strict retained verification. Artifact review
matches all 5,003 source files and 335 runtime files, with all 332 predecessor
runtime files unchanged. These are engineering checks, not scientific observations.

After those gates, [two fixed actual commands](operations/production/final.json)
ran at 12:57:12–12:57:23 UTC. Both exited 2 with identical public receipts,
SHA256 `68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be`.
The diagnostic completed with **MEMBER_KIND_PROFILE** as the sole failing family;
all other **31 families passed**, with no unchecked dependencies. The original
ordered rejection remains `member_kind / ZIP_LAYOUT_UNSUPPORTED`. Archive
acceptance is false and scientific status remains **BLOCKED_SCHEMA**.

The primary traversal completed three local-extra areas before rejection. The
separate aggregate traversal interpreted 15 fixed local headers and completed
five local-extra areas. These are traversal counters, not scientific samples.
The aggregate shares the primary archive; its unused open/close flags do not
indicate failed cleanup. Both runs report successful cleanup and unchanged
source, branch, remote and all 335 runtime files. Whole target-bearing buffers
were read, but member opens, decompressed bytes, XML parses, worksheet/shared
string decodes and formula evaluations are all zero. No actual part name or
content type is disclosed; this result does not identify an offending payload
or establish archive corruption.

The [public-receipt review](actual-review/ACTUAL_REVIEW.md) passes 410 consistency
checks. Its first invocation stopped on a reviewer schema assumption after
29 checks; the narrow correction binds the additive gate's enclosing execution
receipt. Both invocations and original code remain. Neither source operation
was rerun. The earlier artifact pin-record baseline mismatch is also preserved:
the unchanged additive auditor passed after a separate record distinguished
integration-parent and package-baseline roles. No check was weakened.

The [primary OPC standards review](../phase2-opc-part-scope-v1/README.md),
prepared before the actual result, distinguishes general part-name grammar and
content-type/relationship rules from an application's finite filename whitelist.
It does not establish that unknown parts are harmless. Root accepts the
[prospective decision note](prospective-decision/README.final-v2.md) as guidance
for one coherent bounded compatibility and documentary/frame readiness route.
Original notes, the exact clarification and root review are retained. The next
reader must preserve existing profiles, check critical roles and associations,
and stop with a specific NO-GO if its fixed bounds or semantic mapping cannot
be supported. G34 is not an ENVELOPE_VALID receipt and does not authorize the
existing G32 actual operation.

The separate [primary vacancy-method review](../phase2-rhizo-vacancy-methods-v1/README.md)
confirms Angsten et al.'s approximately-zero-pressure convention equating
calculated vacancy formation energy and enthalpy. These are archived VASP/PBE
DFT calculations, with no new DFT. This clarifies the paper's notation only;
Rhizo extraction agreement, historical binding, physical compatibility and
uncertainty remain unestablished. No stored-label error census was computed.

The original preparation README/inventories in `operations/` describe the
unbound recorder before gates. Their historical bindings hash corresponds to
`reviewed-unbound-bindings.json`; final `bindings.json`, `root-binding.json` and
`root-recorder-review.json` document the later exact binding. The package-only
README and pending-PR receipt likewise retain their original observation times.
Public research notes exclude downloaded bodies, private projections and raw
archives. Own paraphrases, short attributed quotations and receipts are retained;
no blanket primary-source redistribution right is asserted.

Root owns publication and exact descendant CI verification, then implementation
of the reviewed complete readiness route. G20 remains unresolved and G21 blocked.
No new model, allocation, threshold, scientific comparison or claim promotion
occurred. Historical research-preview GO and physical/general-superiority NO-GO
remain unchanged; the expired automation remains disabled.
''')
p=R/'GOAL.md';s=p.read_text()
lines=s.splitlines()
for i,line in enumerate(lines):
 if line.startswith('| G20 |'):lines[i]='| G20 | Source identity/license, paired labels/conditions, overlap and evaluation-unit audit before a fresh evaluation | ACTIVE / schema unresolved | [Completed G34 audit](reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md) localizes the sole header-profile failure; archive admission, Li counts, citations, joins and grouping remain unresolved. BAM is an exposed metrology reference; Rhizo is exposed historical stored-label evidence. No fresh study is admitted. |'
 if line.startswith('| G31 |'):lines[i]=line.replace('the exact failed predicate is unresolved. Root preserves the block and reviews a separate bounded diagnostic before any new operation.','G34 subsequently identifies MEMBER_KIND_PROFILE as the sole failing family, preserving this original result.')
 if line.startswith('| G34 |'):lines[i]='| G34 | One categorical all-entry Li header diagnostic with exact first-rejection preservation and explicit unchecked dependencies | DONE; BLOCKED_SCHEMA preserved | [Verified a064a2c0 and actual pair](reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md): all four CI jobs, clean package and independent artifacts pass. Two identical receipts report only MEMBER_KIND_PROFILE failing; 31 families pass, none unchecked. All 335 runtime files held; zero member/XML decoding. Independent public review passes 410 checks, with its first harness failure preserved. |'
s='\n'.join(lines)+'\n'
a=s.index('Parent report `9766b683`');b=s.index('The prospective planning probe',a)
s=s[:a]+'''Current owner/checkpoint: root publishes the completed G34 actual audit and
primary-source method/OPC reviews, then implements one independently reviewed,
bounded compatibility→documentary/frame readiness route. Implementation
`a064a2c0` passed all four original CI jobs at 12:56:39 UTC, clean installed
packaging and independent artifact checks before the two fixed actual commands.
The sole rejected family is the reader's allowed-member profile. This identifies
no actual part/type and does not admit the archive or make unknown payloads safe.

The [primary OPC review](reports/phase2-opc-part-scope-v1/README.md) supports a
general structural naming model with bounded type/relationship validation; it
establishes no workbook semantics. The complete route must resolve documentary
roles and a fixed non-outcome frame, or stop with a specific Li NO-GO for the
present claim. Avoid an indefinite sequence of new predicate diagnostics.
No actual G32 operation is authorized by G34's blocked receipt.

Rhizo's 144 stored pairs remain complete historical fields, with every optional
tolerance NULL and no numerical comparison. The [primary vacancy-method review](reports/phase2-rhizo-vacancy-methods-v1/README.md)
resolves only Angsten et al.'s approximately-zero-pressure energy/enthalpy
convention; these are archived DFT results. Extraction agreement, reference
choice, physical accuracy and uncertainty remain separate unresolved questions.
No new fit, allocation, scientific threshold or fresh predictive claim follows.

'''+s[b:];p.write_text(s)
p=R/'STATUS.md';s=p.read_text();a=s.index('The [G34 diagnostic]');b=s.index('The [implementation]',a)
s=s[:a]+'''[G34 is complete at verified a064a2c0](reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md).
All four original CI jobs, clean installed packaging and independent artifact
checks passed before two fixed actual commands at 12:57 UTC. Both public
receipts are identical: only MEMBER_KIND_PROFILE fails, the other 31 header
families pass and none are unchecked. The archive remains BLOCKED_SCHEMA;
no member, XML, worksheet or shared-string value was decoded. All 335 runtime
files held. The public review passes 410 consistency checks; its first reviewer
schema-assumption failure and narrow correction remain preserved.

The next step is one complete bounded compatibility and documentary/frame
readiness route. [Primary OPC guidance](reports/phase2-opc-part-scope-v1/README.md)
supports general part-name/type/relationship rules, without establishing unknown
payloads' semantic irrelevance. Root owns implementation after independent review;
if bounds or semantic associations cannot be justified, record the specific Li
NO-GO. The original G31 block remains; G34 does not qualify G32's envelope gate.

The [primary vacancy paper](reports/phase2-rhizo-vacancy-methods-v1/README.md)
confirms its approximately-zero-pressure energy/enthalpy convention for archived
DFT. Rhizo extraction accuracy and physical transfer remain unestablished.
No new scientific comparison, fit or allocation has run.

'''+s[b:];p.write_text(s)
p=R/'reports/progress.md';p.write_text(p.read_text()+'''
## 2026-10-16 13:07 UTC — verified actual header audit and primary-method findings

[Exact a064a2c0 verification and actual results](phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md)
are complete. CI 38901590399 passed all four original jobs, observed at
12:56:39 UTC. Clean packaging passes 28 demonstrations/six schemas/16 mandatory
checks, followed by strict retention. Independent artifact checks match 5,003
source files, 335 runtime files and all 332 predecessor runtime files unchanged.
The first additive pin-record mismatch remains, followed by the unchanged
auditor's successful run against the explicitly corrected baseline-role record.

The two fixed actual commands ran at 12:57:12–12:57:23 UTC, exited 2 and returned
identical public receipts (68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be).
Only MEMBER_KIND_PROFILE fails; 31 families pass, with no unchecked dependencies.
All 335 runtime files and source/remote holds agree. No members, XML, worksheet
or shared-string values were decoded. Whole raw-buffer exposure is declared.
The public review passes 410 consistency checks; its first reviewer-only
chronology-field assumption failure and narrow correction remain preserved.
These checks establish no archive admission or scientific sample count.

[Primary OPC research](phase2-opc-part-scope-v1/README.md), prepared before the
result, distinguishes general structural rules from application name whitelists.
[Primary Angsten methods](phase2-rhizo-vacancy-methods-v1/README.md) confirm the
approximately-zero-pressure energy/enthalpy convention for archived VASP/PBE DFT;
Rhizo extraction and physical transfer remain unverified. Whole retrieved bodies
were machine exposed; no raw source bodies are redistributed in these notes.

Root owns this report publication and exact descendant CI verification while
the single complete Li readiness design receives independent review. Next:
implement its bounded structural/documentary/frame route, or record a specific
NO-GO if it cannot support the required semantics. No G32 actual invocation,
new fit, allocation, numeric Rhizo census or fresh performance claim occurred.
G20 remains unresolved/G21 blocked; historical negatives and disabled automation
remain unchanged. A transient exec transport failure during ignored preparation
recovered on the immediate retry and did not execute a source operation.
''')
p=R/'docs/release-validation.md';p.write_text(p.read_text()+'''
## Actual G34 verification and source methods — 2026-10-16

[Implementation a064a2c0 and its actual pair](../reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md)
have completed exact four-job CI, clean 28-case/six-schema/16-check packaging,
strict retained verification and independent artifacts. The actual categorical
audit localizes the sole failing family to MEMBER_KIND_PROFILE; the other 31
pass and none are unchecked. No archive is admitted and no member/XML/value
is decoded. The independent public consistency review passes 410 checks, with
its initial harness failure retained. These are software/custody observations.

[Primary OPC rules](../reports/phase2-opc-part-scope-v1/README.md) support a broader
structural naming model, not an assumption that unknown parts are harmless.
Documentary roles, paired frame, provenance and scientific suitability remain
OPEN. [Primary vacancy methods](../reports/phase2-rhizo-vacancy-methods-v1/README.md)
resolve the paper's approximately-zero-pressure formation energy/enthalpy
convention only; archived DFT and stored Rhizo values do not establish physical
truth or operating-condition transfer. Historical preview GO and scientific
NO-GO remain unchanged. This report descendant needs its own exact CI observation.
''')
p=R/'reports/continuation.json';d=json.loads(p.read_bytes());c=d['current_checkpoint'];d['prior_growth_predicate_implementation_checkpoint']=json.loads(json.dumps(c))
d['execution_status']='ACTIVE_RENEWED_PHASE: verified a064 G34 actual pair complete; sole MEMBER_KIND_PROFILE failure, 31 families pass. Complete bounded Li compatibility/documentary/frame readiness next. Scientific admission unresolved; automation disabled.'
c.update(recorded_at=now,owner='root publication/integration; independent bounded Li design review',published_commit=base,published_ci_run=38901590399,published_ci_all_four_jobs_pass=True,published_ci_status='PASS_ORIGINAL_PUSH_ATTEMPT_1_ALL_FOUR_OBSERVED_2026-10-16T12:56:39.188124+00:00',published_evidence='reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md',working_checkpoint='G34 actual pair complete, identical public receipts; sole MEMBER_KIND_PROFILE failure; no member/XML decoding. Primary OPC and Angsten method reviews complete. G20 unresolved/G21 blocked.',next_action='Publish verification report, verify exact descendant CI, implement one independently reviewed bounded Li compatibility/documentary/frame route or record a specific NO_GO. No scientific allocation selected.')
c['clean_package'].update(commit=base,source_files_audited=5003,runtime_files=335)
c['growth_predicate_audit'].update(status='COMPLETE_ACTUAL_BLOCKED_SCHEMA',report='reports/phase2-growth-predicate-verification-v1/ROOT-CHECKPOINT.md',actual_operations=2,public_receipt_sha256='68c9042325e93cebd08f9dd056ccbf8833b16f4f045f25bbe2e8be69623326be',first_rejection='MEMBER_KIND_PROFILE',families_passing=31,unchecked_dependencies=0,public_review_checks=410,first_reviewer_failure_preserved=True,member_opens=0,xml_parses=0,worksheet_values_decoded=False,whole_target_bearing_buffer_read=True,scientific_schema_approved=False)
c['li_categorical_header_candidate'].update(status='PROMOTED_AND_ACTUAL_PAIR_COMPLETE',actual_invocation=True)
c['rhizo_recorded_label_candidate'].update(status='ACTUAL_READINESS_COMPLETE',actual_invocation=True)
c['vacancy_primary_methods']={'status':'PRIMARY_METHOD_CONVENTION_DOCUMENTED','report':'reports/phase2-rhizo-vacancy-methods-v1/README.md','rhizo_value_agreement_established':False,'new_dft':False}
c['opc_primary_scope']={'status':'PRIMARY_SYNTAX_SCOPE_DOCUMENTED','report':'reports/phase2-opc-part-scope-v1/README.md','workbook_semantics_established':False}
p.write_text(json.dumps(d,indent=2)+'\n')
for name in ['prepare_public_evidence.py','root-prospective-decision-review.json','transient-exec-transport.json']:
 dst=D/'root-publication'/name;dst.parent.mkdir(exist_ok=True);dst.write_bytes((H/name).read_bytes())
(D/'root-publication'/'evidence-copy-map.json').write_text(json.dumps({'at':now,'files':mapping},indent=2,sort_keys=True)+'\n')
print(json.dumps({'copied_evidence':len(mapping),'producer':base,'at':now}))
