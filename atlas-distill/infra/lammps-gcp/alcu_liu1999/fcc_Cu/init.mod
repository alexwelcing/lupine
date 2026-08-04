# init.mod for fcc Cu using Liu et al. 1999 Al-Cu EAM
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

# fcc Cu equilibrium lattice constant (A)
variable	a equal 3.615

boundary	p p p
lattice		fcc $a
region		box block 0 4 0 4 0 4
create_box	2 box
create_atoms	2 box

mass		1 26.982
mass		2 63.546
