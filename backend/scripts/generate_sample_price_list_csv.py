import pandas as pd

def generate_sample_price_list_csv(filepath: str):
    data = {
        "code": [f"ITEM{i:03d}" for i in range(1, 11)],
        "description": [
            "Concrete mix",
            "Steel rebar",
            "Lumber 2x4",
            "Drywall sheet",
            "Insulation roll",
            "Roof shingles",
            "Paint gallon",
            "Electrical wire",
            "PVC pipe",
            "Copper fittings"
        ],
        "unit": [
            "m3",
            "kg",
            "piece",
            "sheet",
            "roll",
            "bundle",
            "gallon",
            "meter",
            "meter",
            "piece"
        ],
        "rate": [
            75.0,
            1.2,
            3.5,
            10.0,
            15.0,
            50.0,
            25.0,
            0.8,
            2.5,
            1.0
        ]
    }
    df = pd.DataFrame(data)
    df.to_csv(filepath, index=False)
    print(f"Sample price list CSV generated at: {filepath}")

if __name__ == "__main__":
    generate_sample_price_list_csv("sample_price_list.csv")