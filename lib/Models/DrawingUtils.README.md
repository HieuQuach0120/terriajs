# DrawingUtils - Hàm vẽ Primitive cho TerriaJS

## Tổng quan

`DrawingUtils` cung cấp các hàm tiện ích để vẽ primitive (điểm, đường, polygon) vào Cesium viewer trong TerriaJS.

## Cài đặt

Các hàm đã được tích hợp vào TerriaJS. Bạn có thể import và sử dụng trực tiếp:

```typescript
import {
  drawPoint,
  drawLine,
  drawPolygon,
  drawPrimitive,
  clearAllDrawings
} from "terriajs/lib/Models/DrawingUtils";
```

## Sử dụng cơ bản

### 1. Vẽ điểm

```typescript
import { drawPoint } from "terriajs/lib/Models/DrawingUtils";
import Cartesian3 from "terriajs-cesium/Source/Core/Cartesian3";
import Color from "terriajs-cesium/Source/Core/Color";

// Tạo vị trí điểm (Hà Nội)
const position = Cartesian3.fromDegrees(105.8342, 21.0278, 100);

// Vẽ điểm
const result = await drawPoint(terria, position, {
  color: Color.RED,
  outlineColor: Color.WHITE,
  width: 15,
  description: "Điểm tại Hà Nội"
});

// Xóa điểm
result.remove();
```

### 2. Vẽ đường

```typescript
import { drawLine } from "terriajs/lib/Models/DrawingUtils";

const positions = [
  Cartesian3.fromDegrees(105.8342, 21.0278, 100), // Hà Nội
  Cartesian3.fromDegrees(106.6297, 10.8231, 100) // TP.HCM
];

const result = await drawLine(terria, positions, {
  color: Color.BLUE,
  width: 3
});
```

### 3. Vẽ polygon

```typescript
import { drawPolygon } from "terriajs/lib/Models/DrawingUtils";

const positions = [
  Cartesian3.fromDegrees(105.0, 20.0, 0),
  Cartesian3.fromDegrees(106.0, 20.0, 0),
  Cartesian3.fromDegrees(106.0, 21.0, 0),
  Cartesian3.fromDegrees(105.0, 21.0, 0)
];

const result = await drawPolygon(terria, positions, {
  color: Color.GREEN.withAlpha(0.5),
  outlineColor: Color.DARKGREEN
});
```

### 4. Vẽ từ dữ liệu JSON

```typescript
import { drawFromJson } from "terriajs/lib/Models/DrawingUtils";

const jsonData = [
  {
    type: "point",
    positions: [Cartesian3.fromDegrees(105.8342, 21.0278, 100)],
    color: Color.RED,
    width: 10
  },
  {
    type: "line",
    positions: [
      Cartesian3.fromDegrees(105.8342, 21.0278, 100),
      Cartesian3.fromDegrees(106.6297, 10.8231, 100)
    ],
    color: Color.BLUE,
    width: 2
  }
];

const results = await drawFromJson(terria, jsonData);
```

## Sử dụng trong TerriaMap

### 1. Tạo DrawingExample instance

```typescript
import { createDrawingExample } from "terriajs/lib/Models/DrawingExample";

// Trong component React hoặc service
const drawingExample = createDrawingExample(terria);
```

### 2. Vẽ các ví dụ

```typescript
// Vẽ điểm ví dụ
await drawingExample.drawExamplePoint();

// Vẽ đường ví dụ
await drawingExample.drawExampleLine();

// Vẽ polygon ví dụ
await drawingExample.drawExamplePolygon();
```

### 3. Quản lý các item đã vẽ

```typescript
// Lấy danh sách item đã vẽ
const items = drawingExample.getDrawnItems();

// Xóa item cụ thể
drawingExample.removeItem(0);

// Xóa tất cả item
drawingExample.clearAllDrawnItems();
```

## API Reference

### drawPrimitive(terria, data)

Hàm vẽ chính cho tất cả loại primitive.

**Parameters:**

- `terria`: Instance của Terria
- `data`: DrawingData object

**Returns:** Promise<DrawingResult>

### drawPoint(terria, position, options)

Vẽ một điểm.

**Parameters:**

- `terria`: Instance của Terria
- `position`: Cartesian3 - vị trí điểm
- `options`: Object tùy chọn
  - `color`: Color - màu điểm
  - `outlineColor`: Color - màu viền
  - `width`: number - kích thước điểm
  - `description`: string - mô tả

### drawLine(terria, positions, options)

Vẽ một đường.

**Parameters:**

- `terria`: Instance của Terria
- `positions`: Cartesian3[] - mảng vị trí
- `options`: Object tùy chọn
  - `color`: Color - màu đường
  - `width`: number - độ rộng đường

### drawPolygon(terria, positions, options)

Vẽ một polygon.

**Parameters:**

- `terria`: Instance của Terria
- `positions`: Cartesian3[] - mảng vị trí
- `options`: Object tùy chọn
  - `color`: Color - màu polygon
  - `outlineColor`: Color - màu viền

### clearAllDrawings(terria)

Xóa tất cả primitive đã vẽ.

**Parameters:**

- `terria`: Instance của Terria

## Lưu ý

1. **Cesium Viewer**: Các hàm chỉ hoạt động khi Cesium viewer đã được khởi tạo.
2. **Memory Management**: Luôn gọi `remove()` để xóa primitive khi không cần thiết.
3. **Performance**: Tránh vẽ quá nhiều primitive cùng lúc để tránh ảnh hưởng hiệu suất.
4. **Error Handling**: Luôn wrap các hàm vẽ trong try-catch để xử lý lỗi.

## Ví dụ hoàn chỉnh

```typescript
import { createDrawingExample } from "terriajs/lib/Models/DrawingExample";

class DrawingService {
  private drawingExample: DrawingExample;

  constructor(terria: Terria) {
    this.drawingExample = createDrawingExample(terria);
  }

  async drawSampleData() {
    try {
      // Vẽ điểm
      await this.drawingExample.drawExamplePoint();

      // Vẽ đường
      await this.drawingExample.drawExampleLine();

      // Vẽ polygon
      await this.drawingExample.drawExamplePolygon();

      console.log("Đã vẽ tất cả sample data");
    } catch (error) {
      console.error("Lỗi khi vẽ:", error);
    }
  }

  clearAll() {
    this.drawingExample.clearAllDrawnItems();
  }
}
```
