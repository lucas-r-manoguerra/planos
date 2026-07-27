# Feature Suggestions — Planos

## Core Features
- **2D Plan Editor**: Interactive canvas where users define terrain dimensions and place rooms (kitchen, living room, bedroom, etc.) with realistic measurements
- **Multi-Floor Support**: Add floors (plantas) with vertical structure visibility
- **Openings Placement**: Position doors and windows on walls with configurable dimensions
- **Realistic Constraints**: Wall thickness (12-30cm), plaster (1.5-2cm), minimum room sizes per Argentine normative

## Structural
- **Column & Beam Layout**: Auto-suggest column positions based on span limits per normativa
- **Load Calculation**: Basic load distribution between floors
- **Structural Validation**: Check against IRAM/CIRSOC standards for Entre Rios

## Configuration
- **Material Library**: Configurable materials with realistic properties
- **Regional Norms**: Selectable normative profiles (IRAM, CIRSOC, Entre Rios/Gualeguay specific)
- **Unit System**: Metric (cm/m) with option to display in different units

## UX Improvements
- **Undo/Redo**: Full action history with Zustand middleware
- **Snap-to-Grid**: Configurable grid snapping for precise placement
- **Measurement Overlay**: Real-time dimension display while placing/dragging
- **PDF Export**: Generate printable plan sheets with dimensions
- **Save & Share**: Cloud saves with shareable links

## Advanced
- **3D Preview**: Basic 3D extrusion of the 2D plan
- **Cost Estimation**: Material quantity takeoff from plan
- **Regulatory Check**: Automated compliance verification against local norms
