This archive includes the LAMMPS input files and data file of the simulated models.

The "in.stacking_LgvAFSubfixPBD.in" is the input file for LAMMPS simulation which can obtain the energetically favorable configuration of graphene/CNT stacking stuctures.

The "in.stacking_ComputeEnergy.in" is the input file for LAMMPS simulation which can output the energy of one frame. If some energy was not output during the simulation process, this input file will be useful. This file can be used to calculate it, saving the considerable time needed for rerunning the simulation."

"CNT_PBD_2tubes_1" -"CNT_PBD_2tubes_4" contains the graphene/CNT stacking structures (.data file) with two parallel aligned CNTs at equal distances. 
Uniform format for file names is "Gr[A]x[B]L2_CNT[C]x2_PBD.data", where
A=length of the graphene ribbon
B=width of the graphene ribbon & length of CNT
C=index of chirality of CNT. eg. A (5, 5) CNT writes "5@5".

"CNT_PBD_3tubes" contains the graphene/CNT stacking structures (.data file) with three parallel aligned CNTs at equal distances. 
The difference between the "CNT_PBD_2tubes" is just one more repeated unit cell. 
The uniform format for file names is "Gr[A]x[B]L2_CNT[C]x3_PBD.data" where A, B, and C have similar meaning as in "CNT_PBD_2tubes"

CrossCNT: the graphene/CNT stacking structure with two cross-aligened CNTs.
The uniform format for file names is "Gr[A]x[B]L2_CNT[C]Cr_PBD.data"
Thus, the size of the graphene in [A] is square, and the suffix behind [C] is "Cr" which is short for cross.

"dump2data.m" is an useful MATLAB code which can turn the output .dump file into .data file for LAMMPS.

