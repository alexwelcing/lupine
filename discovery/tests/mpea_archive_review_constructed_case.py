"""Independent constructed bytes; public shape only, never experimental records."""
from fractions import Fraction
from pathlib import Path
import sys
HERE=Path(__file__).resolve().parent
ROOT=next(parent for parent in HERE.parents if (parent/'src/lupine_discovery/decision_pool.py').is_file()
          and (parent/'scripts/mpea_features.py').is_file())
for path in (ROOT/'src',ROOT/'scripts',ROOT/'tests',HERE):sys.path.insert(0,str(path))
CONTROL_ROOT=ROOT/'.cache/reviewer-controls'
import mpea_fixture_driver as d


def csv_cell(raw):
    return b'"'+raw.replace(b'"',b'""')+b'"' if any(c in raw for c in (b',',b'"',b'\r',b'\n')) else raw


def make_case(*, missing_development=False, missing_evaluation=None,
              all_reserved_missing=False, late_malformed=False):
    header=tuple(('synthetic_header_%02d'%i).encode() for i in range(23))
    sizes=(1,)*7+(2,)*28+(6,)*29+(7,)*11
    assert len(sizes)==75 and sum(sizes)==314 and sum(sizes[:35])==63
    memberships=tuple(g for g,n in enumerate(sizes) for _ in range(n))
    roles=lambda g: 'DEVELOPMENT' if g<35 else 'CALIBRATION' if g<55 else 'EVALUATION'
    lines=[b','.join(header)]
    descriptions=[]
    for ordinal in range(1545):
        eligible=ordinal%2==0 and ordinal//2<314
        if ordinal<628:
            g=memberships[ordinal//2]; group=10+3*g; role=roles(g)
        elif ordinal==1544:
            g=group=None; role='UNRESOLVED_SOURCE'
        else:
            g=None; group=1000+((ordinal-628)%189); role='OUT_OF_SCOPE_TARGET_UNOPENED'
        cells=[b'opaque']*23
        cells[2]=b'"quoted,opaque\r\ncanary\xff"'
        cells[11]=b'\xffUNAUTHORIZED_YS'; cells[13]=b'\xfeUNAUTHORIZED_ELONGATION'
        if eligible:
            cells[11]=str(100+ordinal%17+(g%3)*5).encode()
            cells[13]=str(5+(ordinal%11)).encode()
            if missing_development and role=='DEVELOPMENT': cells[11]=b''
            if all_reserved_missing and role in ('CALIBRATION','EVALUATION'): cells[13]=b''
            if missing_evaluation==g and role=='EVALUATION': cells[13]=b''
        lines.append(b','.join(csv_cell(cell) for cell in cells))
        descriptions.append((ordinal,group,role,eligible,g))
    raw=b'\r\n'.join(lines)+b'\r\n'
    if late_malformed: raw=raw[:-2]+b',unexpected-extra-field\r\n'
    source=d.custody.FixtureSource.from_bytes(raw)
    routes=tuple(d.custody.RowRoute(i,source.sha256+':'+str(i),group,role,eligible)
                 for i,group,role,eligible,g in descriptions)
    table=d.custody.FixtureRoutes(source,header,routes)
    features=[]
    for route,(_,_,_,eligible,g) in zip(routes,descriptions):
        if eligible:
            k=g%5+1
            vector=d.kernel.NormalizedVector(d.kernel.AXES,(Fraction(k,7),Fraction(7-k,7))+(Fraction(0),)*116)
            features.append(d.kernel.FeatureRow(route.record_id,route.ordinal,str(route.source_group),
                vector,'CAST' if route.ordinal%3 else 'UNRESOLVED'))
    return d.FixtureCase(raw,table,tuple(features))
