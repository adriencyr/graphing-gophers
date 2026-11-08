# Equation graphs on the dashboard

Enter a formula in **Mathematical equation**, choose the minimum and maximum x,
then press Enter or choose **Create Graph**. The default range is -10 to 10. The
result uses the existing `GraphPlot` component and requires no API key.

Examples:

- `y = x^2 + 3`
- `2x + 1` or `2 * (x + 1)`
- `sin(x)`, `cos(x)`, or `tan(x)` (radians)
- `sqrt(x)`, `abs(x)`, `log(x)` (natural logarithm), or `exp(x)`
- `1/x` or `x^-2`

Numbers, x, pi, e, parentheses, and + - * / ^ are supported. Use ^ for powers.
The optional `y =` prefix is removed before parsing. Assignments, additional
variables, matrices, property access, and other functions are not accepted.

## Implementation

- `components/EquationGraph.jsx` owns the input, x-range, validation errors, and
  submitted result. Editing the fields does not change the graph until submit. A
  failed submission clears the old plot so it cannot be mistaken for the invalid
  equation. Labels, error descriptions, and status messages support keyboard and
  screen-reader use.
- `lib/equationGraph.js` uses the numeric subset of mathjs to parse one
  expression and restrict its expression tree to supported scalar operations. It
  compiles once, then evaluates at 201 evenly spaced x-values. No JavaScript
  `eval` or dynamically constructed JavaScript function is used by the
  application.
- The helper returns the existing graph shape: title, xLabel, yLabel, and
  points. Optional segments preserve separate continuous portions of the sampled
  graph. Undefined and non-real values are excluded. Division, negative powers,
  and tan have additional boundary checks for common poles between adjacent
  samples.
- `components/GraphPlot.jsx` draws optional segments as separate polylines.
  Existing image graphs without segments retain their original single curve. Its
  optional `showPoints` prop defaults to true; equation graphs set it false to
  avoid covering the densely sampled curve with markers.
- `app/dashboard/page.js` renders the equation form in its existing equation
  section. Image upload and reading remain separate.

## Limits

Expressions are limited to 200 characters. X-range endpoints must be finite,
increasing, and within +/-1,000,000. Displayed y-values are limited to +/-10^12.
If fewer than two real points can be plotted, an accessible error explains it.
Domain restrictions can leave gaps, such as the negative half of `sqrt(x)`.

The curve is a numerical approximation with straight lines between samples. Very
rapid oscillations, narrow features, or more complicated discontinuities can
fall between samples. Adjust the x-range to inspect a smaller interval. These
plots are not a symbolic solution or an exact domain analysis.

## Verification

`npm test` checks formula evaluation, common asymptotes, domain restrictions,
unsupported input, range validation, dashboard submission, updating results,
accessible errors, and backward-compatible image plotting. Run `npm run
typecheck` and `npm run build` to check application integration.

Parsing follows the [mathjs expression documentation][mathjs].

[mathjs]: https://mathjs.org/docs/expressions/parsing.html

