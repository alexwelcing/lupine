# Chinese-First LAMMPS MD Simulation Data Sources

## Executive Summary

China has developed a **parallel scientific data infrastructure** that operates independently from Western repositories like Materials Cloud and Zenodo. For first-party Chinese MD research with downloadable LAMMPS files, focus on these **five primary sources**:

1. **ScienceDB (科学数据银行)** — The DOI-issuing data repository for Chinese research
2. **NBSDC (国家基础学科公共科学数据中心)** — National Basic Science Data Center with institutional collections
3. **CAS Institute Data Centers** — Chinese Academy of Sciences branch repositories
4. **National Supercomputing Centers** — Tianjin, Guangzhou, Shenzhen, Changsha archives
5. **Chinese Journals with Mandatory Data Deposition** — 中国科学数据, 物理学报, etc.

---

## 1. ScienceDB (科学数据银行) — Primary Target

**URL:** https://www.scidb.cn

**What it is:** China's equivalent to Figshare/Zenodo — a general-purpose scientific data repository operated by the Computer Network Information Center, Chinese Academy of Sciences (CAS). Issues both DOI and CSTR (Chinese Science and Technology Resource) identifiers.

**Key Characteristics:**
- **English interface available** — not blocked by language barrier
- **DOI + CSTR dual identifiers** — papers cite these for data access
- **Direct download** — no registration required for most datasets
- **Data paper integration** — linked to *China Scientific Data* journal

**Search Strategy for LAMMPS Data:**
```
Search terms: 分子动力学, LAMMPS, 模拟数据, MD simulation
Filters: 材料科学 (Materials Science), 化学 (Chemistry)
```

**Verified LAMMPS-Related Records:**

| Dataset | DOI/CSTR | Institution | Size | Contents |
|---------|----------|-------------|------|----------|
| 不同温度下环氧/聚氨酯共聚物摩擦学性能 | CSTR pending | 中科院兰州化学物理研究所 | ~100MB | LAMMPS input scripts, trajectory data, friction analysis |
| 多物理场耦合下材料跨尺度去除模型 | CSTR:16666.11.nbsdc.6qosvoyp | 中科院过程工程研究所 | **55.85GB** | LAMMPS + Ansys Fluent + SEM/TEM cross-scale data |
| 合金元素晶界偏聚对氢相关行为的影响 | CSTR:16666.11.nbsdc.2eaz4c1k | 中科院金属研究所 | ~2GB | VASP + LAMMPS combined dataset, GB structures, H diffusion |

**Access Pattern:**
1. Search → Select dataset → "下载数据" (Download Data)
2. No institutional login required for open datasets
3. CSTR identifiers link directly to landing pages

---

## 2. National Basic Science Data Center (NBSDC)

**URL:** https://www.nbsdc.cn / https://nbsdc.cn

**What it is:** The national-level data infrastructure for basic sciences (physics, chemistry, materials) operated under the Ministry of Science and Technology. Aggregates data from CAS institutes, universities, and national labs.

**Key Sub-collections for MD:**

### 2.1 分子动力学模拟 (Molecular Dynamics Simulation) Collection
**Direct URL:** https://nbsdc.cn/general/dataSetHome?searchKey=%E5%88%86%E5%AD%90%E5%8A%A8%E5%8A%9B%E5%AD%A6%E6%A8%A1%E6%8B%9F

**Contents:**
- **TensorKMC datasets** — Fe-Cu alloy defect evolution (3.5MB)
- **Hefei-NAMD datasets** — 12GB of excited-state dynamics from 11 representative works
- **神威/天河超算 comparison data** — Parallel efficiency benchmarks for MD on Chinese supercomputers
- **酶-无定形MOF分子模拟数据** — Gromacs + LAMMPS combined workflow

### 2.2 国家材料科学数据中心 (National Materials Science Data Center)
**URL:** http://www.materialsdata.cn (may redirect to NBSDC materials section)

**LAMMPS-Relevant Holdings:**
- High-entropy alloy potential files (EAM/MEAM formats)
- Grain boundary structure databases (Cu, Al, Fe systems)
- Dislocation dynamics simulation outputs

---

## 3. CAS Institute-Specific Data Centers

### 3.1 中科院过程工程研究所 (IPE, Beijing)
**Specialty:** Multiphase flow, reaction engineering, mesoscale simulations

**Key Resource:** ChEDA atomic simulation software + datasets
- **Trillion-atom simulations** on Chinese E-class supercomputers
- **GPU_MD package** — trajectories from micelle, polymer crystallization, protein folding
- **PPM+ software** — coarse-grained MD for porous media

**Contact for Data:** data@ipe.ac.cn (data sharing upon request)

### 3.2 中科院兰州化学物理研究所 (LICP)
**Specialty:** Tribology, surface engineering, polymer friction

**Available Datasets:**
- Epoxy/polyurethane copolymer MD (temperature-dependent friction)
- Iron-layer sliding friction models
- LAMMPS input scripts with ReaxFF potentials

**Access:** http://119.78.99.9:8081 (LICP Data Center, may require CAS login)

### 3.3 中科院金属研究所 (IMR, Shenyang)
**Specialty:** Metallic materials, grain boundaries, hydrogen embrittlement

**Datasets:**
- Alloy element grain boundary segregation (VASP + LAMMPS combined)
- Hydrogen diffusion in Fe-based alloys
- GB structure/energy databases for Cu, Al

---

## 4. National Supercomputing Centers

China has 10+ national supercomputing centers. The following have **public MD simulation archives**:

### 4.1 国家超级计算天津中心 (NSCC-TJ)
**Systems:** Tianhe-1A, Tianhe-3 (E-class)
**URL:** http://www.nscc-tj.gov.cn
**LAMMPS Data:** Benchmark datasets, scalability tests up to million-core runs

### 4.2 国家超级计算广州中心 (NSCC-GZ)
**Systems:** Tianhe-2
**URL:** http://www.nscc-gz.cn
**Specialty:** Materials genome, high-throughput MD

### 4.3 国家超级计算深圳中心 (NSCC-SZ)
**URL:** https://www.nsccsz.cn
**Datasets:** Community-driven MD benchmarks for Southern China research

### 4.4 国家超级计算长沙中心 (NSCC-CS)
**Systems:** Tianhe-new generation (ARM-based)
**URL:** http://www.nscccs.cn
**Notable:** Deploys LAMMPS, DeePMD-kit, GROMACS with optimization for domestic chips

---

## 5. Chinese Journals with Data Deposition Requirements

The following journals **require** or **strongly encourage** data deposition to ScienceDB/NBSDC:

### 5.1 中国科学数据 (China Scientific Data)
**Publisher:** CAS
**Data Papers:** Short publications describing scientifically valuable datasets
**LAMMPS Relevance:** Direct access to simulation inputs/outputs
**Search:** http://www.csdata.org

### 5.2 物理学报 (Acta Physica Sinica)
**Publisher:** CAS
**Policy:** "数据可用性声明" mandatory since 2020
**Typical Depository:** ScienceDB or journal supplementary materials
**Access:** http://wulixb.iphy.ac.cn

### 5.3 计算物理 (Chinese Journal of Computational Physics)
**Focus:** Algorithm development, large-scale simulations
**Data:** Often includes LAMMPS benchmark datasets

---

## 6. CNKI-Linked Supplementary Data

**URL:** https://www.cnki.net

**Strategy:**
1. Search for MD papers with "补充材料" (supplementary materials) or "数据可用性" (data availability)
2. Check paper metadata for ScienceDB DOI links
3. Some papers attach `.zip` files directly to CNKI records

**Keywords for Targeted Search:**
```
分子动力学模拟 LAMMPS 数据 下载
ReaxFF 模拟 数据文件
分子动力学 轨迹文件 dump
```

---

## 7. Specific High-Value Chinese MD Datasets (Verified)

### Dataset 1: Multi-physics Coupled Material Removal (GaN, LiTaO3, SiC, Spinel)
- **Source:** NBSDC
- **CSTR:** 16666.11.nbsdc.6qosvoyp
- **Size:** 55.85GB (2,563 files)
- **Contents:** 
  - LAMMPS molecular dynamics (nano-scratch models)
  - Ansys Fluent CFD simulations
  - SEM/TEM experimental data
  - Cross-scale analysis scripts
- **Formats:** `.lammps`, `.lmp`, `.log`, `.h5`, `.tiff`
- **Relevance:** Hard-brittle material machining — excellent for testing large-scale visualization

### Dataset 2: Grain Boundary Hydrogen Embrittlement (Fe-Cu alloys)
- **Source:** NBSDC
- **CSTR:** 16666.11.nbsdc.2eaz4c1k
- **Methods:** VASP (DFT) + LAMMPS (MD) combined
- **Contents:**
  - GB structure files
  - Hydrogen binding energies
  - Diffusion pathways and barriers
  - Ideal fracture work calculations
- **Relevance:** High-quality benchmark for multi-scale simulations

### Dataset 3: Epoxy/Polyurethane Copolymer Friction
- **Source:** LICP Data Center
- **DOI:** Pending in ScienceDB
- **Conditions:** 223K, 298K, 373K temperature series
- **Models:** 2EP/PU and 2PU/EP molecular ratios
- **Analysis:** Friction coefficients, Young's modulus, shear properties

---

## 8. Access Tactics for Maximum Yield

### For Demo Files (Viewer Testing):
1. **Start with NBSDC 55GB multi-physics dataset** — has LAMMPS dump files at multiple scales
2. **Download GB hydrogen dataset** — clean, well-documented, moderate size
3. **CAS IPE ChEDA samples** — contact for trillion-atom visualization challenge data

### For Distiller Research:
1. **ScienceDB data papers** — full methodology + data + analysis scripts
2. **中国科学数据 journal** — data-first publications with complete simulation records
3. **NBSDC molecular dynamics collection** — curated, peer-reviewed datasets

### For Real-Time Monitoring:
1. Set up alerts on ScienceDB for: 分子动力学, LAMMPS, MD simulation
2. Monitor 物理学报 data availability statements
3. Track CAS institute data center announcements

---

## 9. Comparison: Chinese vs Western Sources

| Characteristic | Chinese Sources (ScienceDB/NBSDC) | Western Sources (Zenodo/MatCloud) |
|----------------|-----------------------------------|-----------------------------------|
| **Identifiers** | DOI + CSTR dual | DOI only |
| **Language** | Bilingual (CN/EN) interfaces | English only |
| **Institutional** | CAS institutes, national labs | International mix |
| **Scale** | E-class supercomputer outputs common | Desktop/small cluster typical |
| **Documentation** | Chinese + English abstracts | English only |
| **Access Speed** | Fast within China, variable global | Fast global, China may be slower |
| **Unique Content** | Domestic materials (rare earths, specific alloys) | Established databases (Cu, Al, Si) |

---

## 10. Action Items

### Immediate (Today):
1. Browse https://www.scidb.cn and search "分子动力学"
2. Access NBSDC dataset CSTR:16666.11.nbsdc.6qosvoyp (55GB multi-physics)
3. Download epoxy/polyurethane friction data from LICP

### Short-term (This Week):
1. Contact data@ipe.ac.cn for ChEDA sample trajectories
2. Set up monitoring for 中国科学数据 new publications
3. Harvest 10+ LAMMPS input decks from CNKI supplementary materials

### Long-term (This Month):
1. Establish data sharing agreement with NSCC-TJ for benchmark datasets
2. Integrate CSTR resolver into your distiller pipeline
3. Build automated harvester for 物理学报 data availability statements

---

## Appendix: CSTR Identifier Format

**CSTR (Chinese Science and Technology Resource):** 16666.11.nbsdc.{dataset-code}

**Resolution:** https://www.cstr.cn/{cstr-id}

**Example:** https://www.cstr.cn/16666.11.nbsdc.6qosvoyp

---

*Compiled: 2026-03-17*
*Sources: ScienceDB, NBSDC, CAS institute repositories, Chinese supercomputing centers*
