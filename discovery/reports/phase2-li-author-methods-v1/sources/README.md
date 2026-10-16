# Dataset of Tensile Properties for Sub-sized Specimens

[![Scientific Data](https://img.shields.io/badge/Scientific_Data-DOI%3A_10.1038%2Fs41597--024--04329--2-brightgreen.svg)](https://www.nature.com/articles/s41597-024-04329-2) [![Materials Cloud](https://img.shields.io/badge/Materials%20Cloud-10.24435%2Fmaterialscloud%3Aws--8j-blue)](https://doi.org/10.24435/materialscloud:ws-8j) [![arXiv](https://img.shields.io/badge/arXiv-2409.08306v1-b31b1b)](https://arxiv.org/abs/2409.08306v1)

Authors: Longze Li, John W. Merickel, Yalei Tang, Rongjie Song, Joshua E. Rittenhouse, Aleksandar Vakanski, Fei Xu

The dataset contains records of tensile properties of nuclear structural materials. The focus is on studying the influence of specimen dimensions and geometry on mechanical properties such as yield strength, ultimate tensile strength, uniform elongation, and total elongation. The dataset was created through an extensive literature review of scientific articles. The search inclusion criteria targeted peer-reviewed studies on tensile testing of sub-sized specimens. The extracted data points from the literature review are organized into a tabular format database containing 1,070 tensile testing records with 54 parameters, including material type and composition, manufacturing information, irradiation conditions, specimen size and dimensions, and tensile properties. Materials science experts conducted systematic validation checks to ensure the accuracy of the information related to material type, manufacturing processes, treatment methods, chemical composition, testing conditions, as well as other pertinent information.

An open-access version of the dataset is also published at the Materials Cloud Archive, at <a href="https://doi.org/10.24435/materialscloud:ws-kw">https://doi.org/10.24435/materialscloud:ws-kw</a>.

# Files
* <a href="Tensile_Properties_of_Sub-sized_Specimens.xlsx">Tensile_Properties_of_Sub-sized_Specimens.xlsx</a>: the main dataset in a Microsoft Excel workbook format.
* <a href="Sample_Code.ipynb">Sample_Code.ipynb</a>: a Jupyter Notebook containing Python code for loading the dataset and vizualization of several data features.

# Usage Notes
The primary usage of the dataset is to investigate the specimen size effect on the tensile properties of nuclear structural materials. Specifically, the objective is to enable researchers and engineers to apply statistical analysis methods and ML models for studying the size effect on specimens with different sizes and geometries. The dataset is conveniently structured for implementing conventional ML models and deep learning-based models for predicting the tensile properties of sub-sized specimens, including yield strength, ultimate tensile strength, uniform elongation, and total elongation. Loading the dataset and performing exploratory data analysis can easily be done by using standard python libraries, such as pandas, matplotlib, and scikit-learn, as demonstrated in the <a href="Sample_Code.ipynb">Sample Code</a>. A related purpose of the dataset is to establish statistical correlations between the tensile properties of sub-sized and standard-sized specimens.

Another usage of the dataset is for investigating the impact of various test factors on the tensile properties of sub-sized specimens. To this end, statistical analysis methods can be applied to the tensile test records to extract insights about the impact and significance of different input parameters on specific tensile properties. Alternatively, interpretable and explainable ML methods can be implemented for quantifying the contribution of different features, parameters, and conditions to the decision-making process of the models in predicting tensile properties.

Other potential use of the dataset includes design of sub-sized specimens for new materials, whereas by extrapolating the predicted tensile properties for different specimen geometries, the results can be facilitated for determining the optimal size and volume of sub-sized specimens. Additionally, the data can be used for experiment design in tensile tests by identifying the most informative testing conditions that lead to reduced testing cycles for new materials. A promising approach for this task includes the development of active learning ML methods for identifying testing conditions with high data informativeness and representativeness in order to guide the test matrix design for advanced materials.

Conclusively, the dataset can represent a valuable resource for the community, as we are not aware of any similar datasets in the published literature that provide open-source structured data for sub-sized specimens. Our team will continue to improve and expand the dataset by adding new tensile test records and additional mechanical properties for sub-sized specimens. Considering the importance of the specimen size effect on the properties of sub-sized specimens, this work can pave the way for the development of novel data-driven analysis methods and for accelerated qualification of advanced materials.


# Citation
If you use the dataset in your work, please use one of the following citations:

    @ARTICLE{Li2025,
    title={Dataset of Tensile Properties for Sub-sized Specimens of Nuclear Structural Materials},
    author={Li, L. and Merickel, J. and Tang, Y. and Song, R. and Rittenhouse, J. and Vakanski, A. and Xu, F.},
    publisher={Scientific Data},
    year={2025},
    volume={12},
    issue={1},
    article-number={2052-4463},
    url={https://www.nature.com/articles/s41597-024-04329-2},
    doi={https://doi.org/10.1038/s41597-024-04329-2}
    }

    @DATASET{Li2024,
    title={Dataset of Tensile Properties for Sub-sized Specimens},
    author={Li, L. and Merickel, J. and Tang, Y. and Song, R. and Rittenhouse, J. and Vakanski, A. and Xu, F.},
    archive={Materials Cloud Archive},
    year={2024},
    volume={99},
    doi={https://doi.org/10.24435/materialscloud:ws-8j}
    }

    @ARTICLE{Li2024,
    title={Dataset of Tensile Properties for Sub-sized Specimens of Nuclear Structural Materials},
    author={Li, L. and Merickel, J. and Tang, Y. and Song, R. and Rittenhouse, J. and Vakanski, A. and Xu, F.},
    publisher={arXiv},
    year={2024},
    article-number={2409.08306v1},
    url={https://arxiv.org/abs/2409.08306v1},
    doi={https://doi.org/10.48550/arXiv.2409.08306}
    }

# License
<a href="License - MIT.txt">MIT License</a>

# Acknowledgments
This work was supported through the INL Laboratory Directed Research& Development (LDRD) Program under DOE Idaho Operations Office Contract DE-AC07-05ID14517 (project tracking number 24A1081-149). Accordingly, the publisher, by accepting the article for publication, acknowledges that the U.S. Government retains a nonexclusive, paid-up, irrevocable, worldwide license to publish or reproduce the published form of this manuscript or allow others to do so, for U.S. Government purposes.

# Contact or Questions
A. Vakanski, e-mail: vakanski@uidaho.edu

F. Xu, e-mail: fei.xu@inl.gov
