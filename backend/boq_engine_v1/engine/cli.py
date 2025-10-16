import argparse, pathlib
from .api import run_takeoff, export_boq
from .ingest.ifc_reader import open_ifc
from .validation.checks import validate_ifc_model

def main(argv=None):
    p = argparse.ArgumentParser(prog="boq-engine", description="Take-off engine v1 (IFC + DWG/DXF)")
    sub = p.add_subparsers(dest='cmd', required=True)

    v = sub.add_parser('validate', help='Run validation gates and print report')
    v.add_argument('input', type=pathlib.Path)

    t = sub.add_parser('takeoff', help='Run take-off and export BoQ')
    t.add_argument('input', type=pathlib.Path)
    t.add_argument('--mapping', type=pathlib.Path, required=True)
    t.add_argument('--price', type=pathlib.Path, default=None)
    t.add_argument('--out', type=pathlib.Path, required=True)

    args = p.parse_args(argv)
    if args.cmd == 'validate':
        model = open_ifc(args.input)
        validate_ifc_model(model)
        print(f"✔ {args.input} passed basic IFC validation")
        return

    df = run_takeoff(args.input, args.mapping, args.price)
    export_boq(df, args.out)
    print(f"\u2714 BoQ written to {args.out}")

if __name__ == '__main__':
    main()
