# Makefile for IMMI paper compilation

TEX = immi-paper
BIB = references
FIGURES = figures/fig1_eigenvalue_spectra.pdf figures/fig2_dimensionality.pdf figures/fig3_paradox.pdf figures/fig4_forest.pdf

.PHONY: all clean figures

all: figures $(TEX).pdf

$(TEX).pdf: $(TEX).tex $(BIB).bib $(FIGURES)
	pdflatex $(TEX)
	bibtex $(TEX)
	pdflatex $(TEX)
	pdflatex $(TEX)

figures:
	cd figures && python generate_fig1_eigenvalue_spectra.py
	cd figures && python generate_fig2_dimensionality.py
	cd figures && python generate_fig3_paradox.py
	cd figures && python generate_fig4_forest.py

clean:
	rm -f *.aux *.bbl *.blg *.log *.out *.toc *.synctex.gz
	rm -f $(TEX).pdf
