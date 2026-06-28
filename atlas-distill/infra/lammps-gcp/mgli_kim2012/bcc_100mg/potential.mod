# potential.mod for Mg-Li using 2NN MEAM (Kim et al. 2012)
pair_style	meam
pair_coeff	* * library.meam Li Mg LiMg.meam Li Mg

neighbor	1.0 nsq
neigh_modify	once no every 1 delay 0 check yes

min_style	cg
min_modify	dmax ${dmax} line quadratic

thermo		1
thermo_style	custom step temp pe press pxx pyy pzz pxy pxz pyz lx ly lz vol
thermo_modify	norm no
