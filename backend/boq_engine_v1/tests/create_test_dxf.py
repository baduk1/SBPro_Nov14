import ezdxf
from pathlib import Path

def make_test_dxf(path: str = "test_sample_v1.dxf"):
    doc = ezdxf.new(dxfversion='R2018')
    for name,color in [('PL_PIPE',3),('ELEC-LIGHTING',2)]:
        if name not in doc.layers:
            doc.layers.new(name=name, dxfattribs={'color': color})
    ms = doc.modelspace()
    # Pipe: 10m straight + arc ≈ 3.14m
    ms.add_line((0,0,0),(10,0,0), dxfattribs={'layer':'PL_PIPE'})
    ms.add_arc(center=(10,0), radius=1.0, start_angle=0, end_angle=180, dxfattribs={'layer':'PL_PIPE'})
    # Lighting cable polyline (approx 5m)
    pl = ms.add_lwpolyline([(0,1),(2,1),(3.5,2.5),(5,2.5)], dxfattribs={'layer':'ELEC-LIGHTING'})
    # Block: LIGHT × 2
    if 'LIGHT' not in doc.blocks:
        blk = doc.blocks.new(name='LIGHT')
        blk.add_circle((0, 0), radius=0.1)
    ms.add_blockref('LIGHT', (5, 1, 0))
    ms.add_blockref('LIGHT', (7, -1, 0))
    out = Path(path)
    doc.saveas(out)
    print("Saved", out.resolve())

if __name__ == "__main__":
    make_test_dxf()
