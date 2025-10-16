import ezdxf
from pathlib import Path

def make_test_dxf(path: str = "test_sample.dxf"):
    doc = ezdxf.new(dxfversion='R2018')
    # ensure layer names used by mapping.example.yml
    if 'PL_PIPE' not in doc.layers:
        doc.layers.new(name='PL_PIPE', dxfattribs={'color': 3})
    ms = doc.modelspace()
    # add a line of 10 units on PL_PIPE
    ms.add_line((0, 0, 0), (10, 0, 0), dxfattribs={'layer': 'PL_PIPE'})
    # create a simple block named LIGHT (if not exists)
    if 'LIGHT' not in doc.blocks:
        blk = doc.blocks.new(name='LIGHT')
        blk.add_circle((0, 0), radius=0.1)
    # insert the block (ezdxf: use add_blockref)
    ms.add_blockref('LIGHT', (5, 1, 0))
    out = Path(path)
    doc.saveas(out)
    print("Saved", out.resolve())

if __name__ == "__main__":
    make_test_dxf()
