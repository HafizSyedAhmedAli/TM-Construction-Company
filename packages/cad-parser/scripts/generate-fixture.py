import ezdxf

doc = ezdxf.new('R2010')
msp = doc.modelspace()

doc.layers.add(name='WALLS', color=7)
doc.layers.add(name='TEXT', color=2)

# Room 1: Kitchen, 20x12
msp.add_lwpolyline(
    [(0, 0), (20, 0), (20, 12), (0, 12), (0, 0)],
    dxfattribs={'layer': 'WALLS'}
)
msp.add_text('Kitchen 240 sq ft', dxfattribs={'layer': 'TEXT', 'height': 1.0}).set_placement((5, 5))

# Room 2: Living Room, 15x18, adjacent
msp.add_lwpolyline(
    [(20, 0), (35, 0), (35, 18), (20, 18), (20, 0)],
    dxfattribs={'layer': 'WALLS'}
)
msp.add_text('Living Room 270 sq ft', dxfattribs={'layer': 'TEXT', 'height': 1.0}).set_placement((23, 8))

doc.saveas('fixtures/sample-house.dxf')
print('Fixture written to fixtures/sample-house.dxf')