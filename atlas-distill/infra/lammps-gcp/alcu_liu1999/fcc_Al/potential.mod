# potential.mod for Al-Cu using Liu et al. 1999 EAM/alloy
pair_style	eam/alloy
pair_coeff	* * al-cu-set.eam.alloy Al Cu

neighbor	1.0 nsq
neigh_modify	once no every 1 delay 0 check yes

min_style	cg
min_modify	dmax ${dmax} line quadratic

thermo		1
thermo_style	custom step temp pe press pxx pyy pzz pxy pxz pyz lx ly lz vol
thermo_modify	norm no
