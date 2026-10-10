"""Constructed 1545-row source, not archive data; public counts only set shape."""
from fractions import Fraction as F
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import mpea_fixture_driver as driver


def make_case(*, missing_development=False, missing_reserved=False, unknown_features=False):
    header = tuple(('constructed_column_' + str(i)).encode('ascii') for i in range(23))
    sizes = [1]*17 + [2]*8 + [3]*10 + [4]*13 + [5]*6 + [6]*7 + [7]*8 + [8]*3 + [11]*2 + [25]
    assert len(sizes) == 75 and sum(sizes) == 314
    groups = tuple(group for group, count in enumerate(sizes) for _ in range(count))
    roles = {group: ('DEVELOPMENT' if group < 35 else 'CALIBRATION' if group < 55 else 'EVALUATION') for group in range(75)}
    lines = [b','.join(header)]
    for ordinal in range(1545):
        cells = [b'opaque']*23
        if ordinal < 314:
            cells[11], cells[13] = str(100 + ordinal % 13).encode(), b'10'
            if missing_development and roles[groups[ordinal]] == 'DEVELOPMENT':
                cells[11] = b''
            if missing_reserved and roles[groups[ordinal]] != 'DEVELOPMENT':
                cells[13] = b'\xffUNKNOWN_RESERVED'
        else:
            cells[11], cells[13] = b'\xffNEVER_DECODE_YS', b'\xfeNEVER_DECODE_E'
        lines.append(b','.join(cells))
    raw = b'\r\n'.join(lines) + b'\r\n'
    source = driver.custody.FixtureSource.from_bytes(raw)
    routes = []
    for ordinal in range(1545):
        group = groups[ordinal] if ordinal < 314 else 75 + (ordinal-314) % 189
        role = roles[group] if group < 75 else 'OUT_OF_SCOPE_TARGET_UNOPENED'
        if ordinal == 1544:
            group, role = None, 'UNRESOLVED_SOURCE'
        routes.append(driver.custody.RowRoute(ordinal, source.sha256 + ':' + str(ordinal), group, role, ordinal < 314))
    route_table = driver.custody.FixtureRoutes(source, header, tuple(routes))
    # Construct with kernel's own class, even if another loader replaced the
    # representation module's exported class later.
    vector = driver.kernel.NormalizedVector(driver.kernel.AXES, (F(1,3), F(2,3)) + (F(0),)*116)
    features = tuple(driver.kernel.FeatureRow(route.record_id, route.ordinal, str(route.source_group),
        None if unknown_features else vector, 'CAST' if route.ordinal % 2 else 'UNRESOLVED')
        for route in routes[:314])
    return driver.FixtureCase(raw, route_table, features)
