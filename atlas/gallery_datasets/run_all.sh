#!/bin/bash

echo 'Starting ATLAS Gallery Generation...'

echo 'Running crack2d dataset...'
cd ..\lammps_src\examples\crack
lmp -in in.crack
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running indent dataset...'
cd ..\lammps_src\examples\indent
lmp -in in.indent
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running melt dataset...'
cd ..\lammps_src\examples\melt
lmp -in in.melt
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running pour dataset...'
cd ..\lammps_src\examples\pour
lmp -in in.pour
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running micelle dataset...'
cd ..\lammps_src\examples\micelle
lmp -in in.micelle
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running colloid dataset...'
cd ..\lammps_src\examples\colloid
lmp -in in.colloid
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running shear dataset...'
cd ..\lammps_src\examples\shear
lmp -in in.shear
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running peptide dataset...'
cd ..\lammps_src\examples\peptide
lmp -in in.peptide
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

echo 'Running eim dataset...'
cd ..\lammps_src\examples\eim
lmp -in in.eim
mv dump.*.lammpstrj ../../gallery_datasets/
cd -

