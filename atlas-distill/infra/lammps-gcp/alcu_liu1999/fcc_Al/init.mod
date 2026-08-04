# init.mod for fcc Al using Liu et al. 1999 Al-Cu EAM
units		metal
variable	cfac equal 1.0e-4
variable	cunits string GPa
variable	up equal 1.0e-6
variable	atomjiggle equal 1.0e-5

variable	etol equal 0.0
variable	ftol equal 1.0e-10
variable	maxiter equal 100
variable	maxeval equal 1000
variable	dmax equal 1.0e-2

# fcc Al equilibrium lattice constant (A)
variable	a equal 4.05

boundary	p p p
lattice		fcc $a
region		box block 0 4 0 4 0 4
create_box	2 box
create_atoms	1 box

mass		1 26.982
mass		2 63.546
