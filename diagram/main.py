import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

file_count = 10  

all_data = []
generations_set = None

# Pętla do przetwarzania plików
for i in range(1, file_count + 1):
    # Wczytanie danych z pliku CSV
    file_name = f'generation_stats_{i}.csv'
    data = pd.read_csv(file_name)

    # Sprawdzanie, czy generacje są zgodne w każdym pliku
    if generations_set is None:
        generations_set = set(data['Generation'])
    else:
        generations_set.intersection_update(data['Generation'])

    # Agregowanie danych do listy
    all_data.append(data)

# Przekształcenie zbioru generacji w posortowaną listę
generations = sorted(list(generations_set))

# Łączenie danych z wszystkich plików i pozostawienie tylko wspólnych generacji
merged_data = pd.DataFrame()

for data in all_data:
    # Filtrujemy dane tylko dla wspólnych generacji
    filtered_data = data[data['Generation'].isin(generations)]
    merged_data = pd.concat([merged_data, filtered_data])

# Obliczanie MaxFitness, MinFitness, MeanFitness, StdDev dla każdej generacji
max_fitness_array = merged_data.groupby('Generation')['MaxFitness'].max().values
min_fitness_array = merged_data.groupby('Generation')['MaxFitness'].min().values
mean_fitness_array = merged_data.groupby('Generation')['MaxFitness'].mean().values
std_fitness_array = merged_data.groupby('Generation')['MaxFitness'].std().values

# Przygotowanie wykresów
plt.figure(figsize=(12, 8))

# Wykres: MaxFitness (najlepszy wynik)
plt.plot(generations, mean_fitness_array, label='Max Fitness', color='blue', linestyle='-', marker='o')
plt.fill_between(generations, mean_fitness_array - std_fitness_array, mean_fitness_array + std_fitness_array, color='blue', alpha=0.2)

# Wykres: MinFitness (najgorszy wynik)
plt.plot(generations, min_fitness_array, label='Min Fitness', color='red', linestyle='--', marker='x')
plt.fill_between(generations, min_fitness_array - std_fitness_array, min_fitness_array + std_fitness_array, color='red', alpha=0.2)

# Wykres: Mean Fitness (średni wynik)
plt.plot(generations, mean_fitness_array, label='Mean Fitness', color='green', linestyle='-.', marker='s')
plt.fill_between(generations, mean_fitness_array - std_fitness_array, mean_fitness_array + std_fitness_array, color='green', alpha=0.2)

# Dodanie tytułów i etykiet
plt.title('Wyniki eksperymentu: Fitness w czasie')
plt.xlabel('Generacja')
plt.ylabel('Fitness')
plt.legend()

# Wyświetlenie wykresu
plt.grid(True)
plt.show()
