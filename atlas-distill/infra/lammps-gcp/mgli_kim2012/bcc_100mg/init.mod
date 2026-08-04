# init.mod for bcc Mg-Li random solid solution (Kim 2012 MEAM)
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

# Approximate bcc lattice constant for Li-rich Mg-Li (A)
variable	a equal 3.50

boundary	p p p
lattice		bcc $a
region		box block 0 4 0 4 0 4
create_box	2 box
create_atoms	1 box
set		type 1 type/fraction 2 1.0 12345

mass		1 6.94
mass		2 24.305
