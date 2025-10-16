
import argparse, pathlib, sys
from .api import run_takeoff, export_boq

def main(argv=None):
    parser = argparse.ArgumentParser(prog="boq-engine", description="Take-off engine v0 (IFC + DWG/DXF)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("takeoff", help="Run take-off and export BoQ")
    t.add_argument("input", type=pathlib.Path, help="Path to IFC/DWG/DXF/PDF (DWG converted to DXF via ODA)")
    t.add_argument("--mapping", type=pathlib.Path, required=True, help="YAML mapping file")
    t.add_argument("--price", type=pathlib.Path, default=None, help="CSV price list (code,description,unit,rate,currency)")
    t.add_argument("--out", type=pathlib.Path, required=True, help="Output CSV/XLSX path")

    args = parser.parse_args(argv)

    df = run_takeoff(args.input, args.mapping, args.price)
    export_boq(df, args.out)
    print(f"✔ BoQ written to {args.out}")

if __name__ == '__main__':
    main()
