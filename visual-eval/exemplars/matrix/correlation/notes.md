A Pearson correlation matrix for eight cardiometabolic screening measures, drawn as a shaded correlation matrix in the corrgram tradition of Friendly (2002) and the lower-triangle "color" layout of R's corrplot: because r(A, B) = r(B, A) the matrix is symmetric, so only the lower triangle is drawn, the diagonal (always r = 1) is used to name the variables, and each coefficient is both printed and encoded on a diverging colour scale whose neutral midpoint is exactly zero. Sources: [Friendly, Corrgrams: exploratory displays for correlation matrices, The American Statistician 56 (2002)](https://www.datavis.ca/papers/corrgram.pdf), [corrplot reference manual](https://cran.r-project.org/web/packages/corrplot/corrplot.pdf), [ColorBrewer RdBu diverging scheme](https://colorbrewer2.org/).

Why it works as the exemplar for this type:

- Only one triangle is drawn; the redundant half and the r = 1 diagonal carry no data, so the diagonal becomes the variable-name labels and a coefficient is found at the intersection of its two variables' row and column.
- The colour scale diverges from a near-white neutral at 0 to blue for negative and red for positive, with symmetric end points at −1 and +1, so strength reads as saturation and sign reads as hue.
- Every cell prints the coefficient to two decimals with a true minus sign; the colour supports the number, it never replaces it. Text flips to white on the darkest cells and meets WCAG 4.5:1 everywhere.
- The legend is a continuous colour bar with ticks at −1, −0.5, 0, +0.5, +1 and "Negative" / "Positive" named in their hues, placed in the empty upper triangle so it costs no extra canvas.
- A short note states sample size and the significance threshold, which is what a reader needs to decide whether a small r matters.

Palette: ink #1e293b, slate #475569, diagonal panel #f1f5f9, strong negative #2166ac, weak negative #92c5de, zero #f7f7f7, weak positive #f4a582, strong positive #b2182b.
