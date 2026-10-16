# Exact nonlinear interval operations

`lupine_discovery.nonlinear` adds four finite, exact rational operations to the
existing `Interval` type:

| Function | Enclosure | Domain |
| --- | --- | --- |
| `multiply_interval(a, b)` | Smallest interval containing all four endpoint products | Any finite intervals |
| `reciprocal_interval(a)` | `[1/a.upper, 1/a.lower]` | Entire interval strictly positive or strictly negative |
| `divide_interval(a, b)` | Product hull of `a` and the reciprocal of `b` | Denominator interval excludes zero |
| `square_interval(a)` | Maximum is the larger endpoint square; minimum is zero if the interval contains zero, otherwise the smaller endpoint square | Any finite interval |

Every operation returns a finite `Interval` with `Fraction` endpoints. Inputs
must already be `Interval` instances. Intervals containing zero are rejected
for reciprocal and division, including a zero endpoint and including a zero
numerator. A domain failure is not silently replaced with a large finite number
or an infinity unsupported by the finite kernel.

```python
from lupine_discovery.core import Interval
from lupine_discovery.nonlinear import multiply_interval, square_interval

unknown = Interval(-2, 3)
assert multiply_interval(unknown, unknown) == Interval(-6, 9)
assert square_interval(unknown) == Interval(0, 9)
```

Multiplication allows operands to vary independently over their intervals.
When both operands are the same physical value, `square_interval` preserves
that relationship and can give a tighter enclosure. Other dependencies may
make a composition wider than the true range. This conservatism preserves
containment; it is not evidence that independently calibrated inputs are jointly
sound. The caller must establish the input enclosures and the physical meaning
of the chosen expression.

The test suite enumerates 2,025 rational interval pairs, 27,225 contained
product worlds, and 6,600 defined quotient worlds; true rational values provide
an independent arithmetic oracle. Separate tests cover positive and negative
reciprocals, square sign cases, zero-domain rejection, exact values beyond float
range, interval refinement, and invalid inputs. Run:

```sh
python -m unittest discover -s tests -p 'test_nonlinear.py' -v
```

This is executable software evidence for the finite operations. It does not
claim a formal refinement from Python to Lean or prove physical model validity.
