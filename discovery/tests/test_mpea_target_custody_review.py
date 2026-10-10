"""Independent constructed-byte custody probes; no scientific file access."""
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import FrozenInstanceError
from decimal import Decimal
from fractions import Fraction
from hashlib import md5, sha256
import importlib.util
import io
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[1] / 'scripts/mpea_target_custody.py'
SPEC = importlib.util.spec_from_file_location('independent_target_custody', SOURCE)
c = importlib.util.module_from_spec(SPEC); sys.modules[SPEC.name] = c; SPEC.loader.exec_module(c)
HEADER = tuple(('synthetic-column-' + str(i)).encode('ascii') for i in range(23))
DEV = frozenset({'DEVELOPMENT'})
RESERVED = frozenset({'CALIBRATION', 'EVALUATION'})
VARIANTS = (b'\xff\xfePRIVATE-9823', b'\0PRIVATE-9823', b'NaN', b'1e99999999',
            b'1,2', b'"PRIVATE-9823"', b'PRIVATE\r\n9823', b'', b' \t', b'NR', b'1/2', b'-999')


def quote(raw):
    return b'"' + raw.replace(b'"', b'""') + b'"' if any(x in raw for x in (b',', b'"', b'\r', b'\n')) else raw


def fields(ys=b'3.5', elongation=b'2'):
    row = [b'OPAQUE-9823'] * 23
    row[11], row[13] = ys, elongation
    return row


def fixture(records, roles=None, eligible=None, *, groups=None, ending=b'\n', terminate=True, bom=b'', suffix=b''):
    raw = bom + ending.join(b','.join(map(quote, row)) for row in (HEADER, *records))
    raw += ending if terminate else b''
    raw += suffix
    source = c.FixtureSource(len(raw), md5(raw).hexdigest(), sha256(raw).hexdigest())
    roles = roles if roles is not None else ['DEVELOPMENT'] * len(records)
    eligible = eligible if eligible is not None else [True] * len(records)
    if groups is None:
        groups = [None if role == 'UNRESOLVED_SOURCE' else i for i,role in enumerate(roles)]
    routes = c.FixtureRoutes(source, HEADER, tuple(c.RowRoute(i, source.sha256 + ':' + str(i), group, role, use)
        for i,(group,role,use) in enumerate(zip(groups,roles,eligible))))
    return raw,routes


def normalized(rows):
    result=[]
    for row in rows:
        item=row.canonical(); item['route']['record_id']='whole-source:' + str(row.route.ordinal);result.append(item)
    return result


class TargetCustodyReview(unittest.TestCase):
    def test_authorization_precedes_byte_accumulation_in_every_cell(self):
        records=[fields(b'7',b'8') for _ in range(6)]
        roles=['DEVELOPMENT','CALIBRATION','EVALUATION','DEVELOPMENT','OUT_OF_SCOPE_TARGET_UNOPENED','UNRESOLVED_SOURCE']
        eligible=[True,True,True,False,False,False]
        buffers=[]
        class ObservedBuffer(bytearray):
            def __init__(self):super().__init__();buffers.append(self)
        raw,routes=fixture(records,roles,eligible)
        with patch.object(c,'bytearray',ObservedBuffer,create=True):
            chosen=c._authorized_cells(raw,routes,DEV)
        self.assertEqual([(r.ordinal,ys,e) for r,ys,e in chosen],[(0,b'7',b'8')])
        self.assertEqual(sum(len(item) for item in buffers),sum(map(len,HEADER))+2)
        self.assertFalse(any(b'OPAQUE-9823' in item for item in buffers))
        self.assertEqual(sum(bool(item) for item in buffers),25)

    def test_372_opaque_cell_replacements_preserve_every_authorized_result(self):
        records=[fields() for _ in range(6)]
        roles=['DEVELOPMENT','CALIBRATION','EVALUATION','DEVELOPMENT','OUT_OF_SCOPE_TARGET_UNOPENED','UNRESOLVED_SOURCE']
        eligible=[True,True,True,False,False,False]
        raw,routes=fixture(records,roles,eligible); baseline=normalized(c.parse_fixture_targets(raw,routes,DEV))
        positions=[(0,column) for column in range(23) if column not in (11,13)]
        positions += [(row,column) for row in range(1,6) for column in (11,13)]
        checked=0
        for row,column in positions:
            for replacement in VARIANTS:
                changed=[list(values) for values in records]; changed[row][column]=replacement
                raw,routes=fixture(changed,roles,eligible)
                seen=[]; original=c.parse_target
                def observe(token,name):seen.append((token,name));return original(token,name)
                with patch.object(c,'parse_target',side_effect=observe):
                    result=c.parse_fixture_targets(raw,routes,DEV)
                self.assertEqual(normalized(result),baseline)
                self.assertEqual(seen,[(b'3.5','yield_strength'),(b'2','elongation')])
                checked+=1
        self.assertEqual(checked,372)

    def test_reserved_roles_are_symmetric_and_all_authorized_bad_rows_survive(self):
        records=[fields(b'',b'NaN'),fields(b'-1',b'garbage'),fields(b'0',b'0'),fields(b'\xff',b'1e155')]
        expected=None
        for roles in (['CALIBRATION','EVALUATION']*2,['EVALUATION','CALIBRATION']*2):
            raw,routes=fixture(records,roles)
            selected=c.parse_fixture_targets(raw,routes,RESERVED)
            self.assertEqual([row.route.ordinal for row in selected],list(range(4)))
            summary=c.summarize_targets(selected)
            if expected is None:expected=summary
            else:self.assertEqual(summary,expected)
            self.assertEqual(summary['row_count'],4);self.assertEqual(summary['complete_row_count'],1)
            self.assertEqual(summary['target_status_counts']['yield_strength']['SEMANTIC_CONFLICT'],1)
            self.assertNotIn('rows',summary);self.assertNotIn('garbage',repr(summary))

    def test_whole_identity_size_md5_sha_and_known_real_identity_precede_framing(self):
        raw,routes=fixture([fields()])
        altered_sources=(c.FixtureSource(len(raw),'0'*32,routes.source.sha256),
                         c.FixtureSource(len(raw),routes.source.md5,'0'*64),
                         c.FixtureSource(len(raw)+1,routes.source.md5,routes.source.sha256))
        for source in altered_sources:
            changed=c.FixtureRoutes(source,HEADER,(c.RowRoute(0,source.sha256+':0',0,'DEVELOPMENT',True),))
            with patch.object(c,'_authorized_cells',side_effect=AssertionError('unverified frame')):
                with self.assertRaisesRegex(c.CustodyError,'^SOURCE_IDENTITY_MISMATCH$'):
                    c.parse_fixture_targets(raw,changed,DEV)
        with patch.object(c,'_authorized_cells',side_effect=AssertionError('unverified frame')):
            with self.assertRaises(c.CustodyError):c.FixtureSource(332126,'0'*32,c.REAL_SOURCE_SHA256)
        with patch.object(c,'sha256',side_effect=AssertionError('oversized bytes hashed')):
            with self.assertRaises(c.CustodyError):routes.source.verify(raw+b'x')
            with self.assertRaises(c.CustodyError):c.FixtureSource.from_bytes(b'x'*(c.MAX_SOURCE_BYTES+1))

    def test_every_late_framing_failure_precedes_first_numeric_call(self):
        good,_=fixture([fields()])
        tails=(b'\n',b'"unterminated',b'x\r',b'1,2\n',b','*23+b'\n',b'"closed"bad'+b','*22+b'\n')
        for tail in tails:
            raw=good+tail;source=c.FixtureSource.from_bytes(raw)
            routes=c.FixtureRoutes(source,HEADER,(c.RowRoute(0,source.sha256+':0',0,'DEVELOPMENT',True),))
            with patch.object(c,'parse_target',side_effect=AssertionError('partial numeric decode')):
                with self.subTest(tail=tail),self.assertRaises(c.CustodyError):c.parse_fixture_targets(raw,routes,DEV)

    def test_count_header_and_role_authority_mismatch_never_decode(self):
        raw,routes=fixture([fields(),fields()])
        shorter=c.FixtureRoutes(routes.source,HEADER,routes.rows[:1])
        changed_header=(b'WRONG',*HEADER[1:]);wrong=c.FixtureRoutes(routes.source,changed_header,routes.rows)
        with patch.object(c,'parse_target',side_effect=AssertionError('numeric decode forbidden')):
            for bad in (shorter,wrong):
                with self.assertRaises(c.CustodyError):c.parse_fixture_targets(raw,bad,DEV)
            for roles in ({'DEVELOPMENT'},frozenset({'CALIBRATION'}),frozenset({'EVALUATION'}),frozenset(),c.ROLES):
                with self.assertRaisesRegex(c.CustodyError,'^UNAUTHORIZED_TARGET_ACCESS$'):c.parse_fixture_targets(raw,routes,roles)

    def test_quoted_final_fields_bom_newlines_and_trailing_empty_are_exact(self):
        for ending in (b'\n',b'\r\n'):
            for terminated in (False,True):
                row=fields(b' \t+1.25e1\t',b'1\n2');row[0]=b'quoted,"opaque"\r\n\xff';row[-1]=b''
                raw,routes=fixture([row],ending=ending,terminate=terminated,bom=b'\xef\xbb\xbf')
                result=c.parse_fixture_targets(raw,routes,DEV)[0]
                self.assertEqual(result.yield_strength.value,Fraction(25,2))
                self.assertEqual(result.elongation.status,'UNSUPPORTED_LEXICAL')

    def test_raw_field_limit_counts_quotes_and_fails_before_numeric_decode(self):
        for token,allowed in ((b'x'*16384,True),(b'x'*16385,False),
                              (b'"'*8191,True),(b'"'*8192,False)):
            row=fields();row[0]=token;raw,routes=fixture([row])
            if allowed:self.assertTrue(c.parse_fixture_targets(raw,routes,DEV)[0].complete)
            else:
                with patch.object(c,'parse_target',side_effect=AssertionError('early numeric decode')):
                    with self.assertRaisesRegex(c.CustodyError,'^CSV_FRAMING_INVALID$'):c.parse_fixture_targets(raw,routes,DEV)

    def test_exact_record_byte_cap_accepts_boundary_and_rejects_next_byte(self):
        # 22 separators + 3 opaque fields at16384 + fourth field16360 + two one-byte targets =65536.
        row=[b'']*23;row[0:4]=[b'x'*16384]*3+[b'x'*16360];row[11]=row[13]=b'0'
        self.assertEqual(len(b','.join(map(quote,row))),65536)
        for terminate in (False,True):
            raw,routes=fixture([row],terminate=terminate)
            self.assertTrue(c.parse_fixture_targets(raw,routes,DEV)[0].complete)
            bad=list(row);bad[3]+=b'x';raw,routes=fixture([bad],terminate=terminate)
            with patch.object(c,'parse_target',side_effect=AssertionError('early numeric decode')):
                with self.assertRaises(c.CustodyError):c.parse_fixture_targets(raw,routes,DEV)

    def test_4096_rows_are_preserved_and_late_extra_row_cannot_decode_prefix(self):
        row=[b'']*23;row[11]=row[13]=b'0'
        raw,routes=fixture([row]*4096)
        result=c.parse_fixture_targets(raw,routes,DEV)
        self.assertEqual(len(result),4096)
        self.assertEqual([item.route.ordinal for item in result],list(range(4096)))
        self.assertTrue(all(item.complete for item in result))
        extra=raw+b','.join(row)+b'\n';source=c.FixtureSource.from_bytes(extra)
        new_routes=c.FixtureRoutes(source,HEADER,tuple(c.RowRoute(i,source.sha256+':'+str(i),i,'DEVELOPMENT',True)
            for i in range(4096)))
        with patch.object(c,'parse_target',side_effect=AssertionError('partial numeric decode')):
            with self.assertRaisesRegex(c.CustodyError,'^CSV_COUNT_MISMATCH$'):
                c.parse_fixture_targets(extra,new_routes,DEV)

    def test_exact_decimal_oracle_over_sign_mantissa_and_exponent_grid(self):
        tested=0
        for sign in ('','+','-'):
            for mantissa in ('0','0.0','1','.5','1.','000.125','123456789.0123456789'):
                for exponent in (-256,-155,-154,-1,0,1,154,155,256):
                    token=f'{sign}{mantissa}e{exponent}'.encode('ascii')
                    exact=Fraction(Decimal(token.decode('ascii')))
                    for target in c.TARGET_NAMES:
                        result=c.parse_target(token,target)
                        if max(exact.numerator.bit_length(),exact.denominator.bit_length())>512:
                            self.assertEqual(result.reason,'TARGET_BITS_LIMIT')
                        elif exact<0:self.assertEqual(result.reason,'NEGATIVE_YS' if target=='yield_strength' else 'NEGATIVE_ELONGATION')
                        else:self.assertEqual((result.status,result.value),('VALID',exact))
                        tested+=1
        self.assertEqual(tested,378)

    def test_preflight_happens_before_integer_fraction_or_power_construction(self):
        bad=((b'0'*129,'TOKEN_BYTES_LIMIT'),(b'1e0000','EXPONENT_LIMIT'),(b'0e-257','EXPONENT_LIMIT'),
             (b'1e999','EXPONENT_LIMIT'),(b'\xff','NON_ASCII_TOKEN'),(b'NaN','NONFINITE_TOKEN'))
        with patch.object(c,'int',side_effect=AssertionError('int reached'),create=True), \
             patch.object(c,'Fraction',side_effect=AssertionError('Fraction reached')), \
             patch.object(c,'_power10',side_effect=AssertionError('power reached')):
            for token,reason in bad:self.assertEqual(c.parse_target(token,'elongation').reason,reason)

    def test_missing_whitespace_nonfinite_limits_and_conflicts_stay_distinct(self):
        cases={b'':'MISSING',b'\t  \t':'MISSING',b'\n':'UNSUPPORTED_LEXICAL',b'\r':'UNSUPPORTED_LEXICAL',
               b'\xc2\xa0':'UNSUPPORTED_LEXICAL',b'NULL':'UNSUPPORTED_LEXICAL',b'NR':'UNSUPPORTED_LEXICAL',
               b'0/1':'UNSUPPORTED_LEXICAL',b'1%':'UNSUPPORTED_LEXICAL',b'1,000':'UNSUPPORTED_LEXICAL',
               b'-Inf':'UNSUPPORTED_NONFINITE',b'+nAn':'UNSUPPORTED_NONFINITE',b'Infinity':'UNSUPPORTED_NONFINITE',
               b'1e155':'UNRESOLVED_LIMIT',b'-0.01':'SEMANTIC_CONFLICT',b'-0e-256':'VALID'}
        for raw,status in cases.items():self.assertEqual(c.parse_target(raw,'elongation').status,status)
        self.assertEqual(c.parse_target(b' '*16384,'elongation').status,'MISSING')
        self.assertEqual(c.parse_target(b' '+b'1'*128+b'\t','elongation').status,'VALID')
        self.assertEqual(c.parse_target(b'1e154','elongation').value,Fraction(10**154))
        self.assertEqual(c.parse_target(b'10e-155','elongation').value,Fraction(1,10**154))

    def test_route_group_role_and_source_ordinal_conflicts_are_fail_closed(self):
        raw,routes=fixture([fields(),fields()])
        failures=[lambda:c.FixtureRoutes(routes.source,HEADER,(routes.rows[1],routes.rows[0])),
                  lambda:c.FixtureRoutes(routes.source,HEADER,(routes.rows[0],routes.rows[0])),
                  lambda:c.FixtureRoutes(routes.source,HEADER,(routes.rows[0],c.RowRoute(1,routes.source.sha256+':1',0,'EVALUATION',True))),
                  lambda:c.RowRoute(0,'x',None,'DEVELOPMENT',True),
                  lambda:c.RowRoute(0,'x',0,'UNRESOLVED_SOURCE',False),
                  lambda:c.RowRoute(0,'x',0,'OUT_OF_SCOPE_TARGET_UNOPENED',True),
                  lambda:c.RowRoute(False,'x',0,'DEVELOPMENT',True)]
        for call in failures:
            with self.assertRaises(c.CustodyError):call()

    def test_no_io_logs_exception_payloads_or_unrelated_cells_escape(self):
        raw,routes=fixture([fields(b'PRIVATE-9823',b'\xffPRIVATE-9823')])
        stdout,stderr=io.StringIO(),io.StringIO()
        with patch('builtins.open',side_effect=AssertionError('filesystem forbidden')),redirect_stdout(stdout),redirect_stderr(stderr):
            result=c.parse_fixture_targets(raw,routes,DEV)
            public=c.summarize_targets(result)
            self.assertNotIn('PRIVATE-9823',repr(public));self.assertNotIn('PRIVATE-9823',repr(result))
            with self.assertRaises(c.CustodyError) as error:c.parse_fixture_targets(raw,routes,{'PRIVATE-9823'})
            self.assertNotIn('PRIVATE-9823',str(error.exception))
        self.assertEqual(stdout.getvalue()+stderr.getvalue(),'')
        with self.assertRaises(FrozenInstanceError):result[0].yield_strength.status='VALID'


if __name__=='__main__':unittest.main()
