import json
import re
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

def extract_year(potential_name):
    match = re.search(r'-(\d{4})', potential_name)
    if match:
        return int(match.group(1))
    return None

def main():
    with open('../benchmark_manifold.json', 'r') as f:
        data = json.load(f)
    
    years = []
    dims = []
    r2s = []
    
    for entry in data:
        year = extract_year(entry['potential'])
        if year is not None:
            years.append(year)
            dims.append(entry['effective_dimensionality'])
            r2s.append(entry['log_r_squared'])
            
    # Plot 1: Year vs Effective Dimensionality
    plt.figure(figsize=(8, 5))
    sns.regplot(x=years, y=dims, scatter_kws={'alpha':0.6, 'color':'#2563eb'}, line_kws={'color':'#ef4444'})
    plt.title('Evolution of Prediction Error Dimensionality (1980 - 2025)')
    plt.xlabel('Publication Year')
    plt.ylabel('Effective Dimensionality (PR)')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('../../paper/year_stratified_dim.png', dpi=300)
    
    # Plot 2: Year vs Log R-squared (Vandermonde Linearity)
    plt.figure(figsize=(8, 5))
    sns.regplot(x=years, y=r2s, scatter_kws={'alpha':0.6, 'color':'#10b981'}, line_kws={'color':'#ef4444'})
    plt.title('Evolution of Vandermonde Linearity ($R^2$)')
    plt.xlabel('Publication Year')
    plt.ylabel('Log Eigenvalue Linearity ($R^2$)')
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('../../paper/year_stratified_r2.png', dpi=300)

    print("Generated year_stratified_dim.png and year_stratified_r2.png")

if __name__ == '__main__':
    main()
