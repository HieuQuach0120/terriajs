import JulianDate from "terriajs-cesium/Source/Core/JulianDate";
import PropertyBag from "terriajs-cesium/Source/DataSources/PropertyBag";
import isDefined from "../../Core/isDefined";

// Mapping của các trường cần hiển thị với tên tiếng Việt
const FILTERED_PROPERTIES: Record<string, string> = {
  elementType: "Kiểu",
  elementId: "ID",
  "cesium#estimatedHeight": "Chiều cao ước tính",
  "cesium#longitude": "Kinh độ",
  "cesium#latitude": "Vĩ độ",
  building: "Loại công trình",
  name: "Tên",
  "name:en": "Tên Tiếng Anh",
  "addr:city": "Tỉnh",
  "addr:country": "Quốc gia",
  "addr:housenumber": "Số nhà",
  "addr:street": "Phố",
  "addr:subdistrict": "Phường"
};

/**
 * Tạo HTML hiển thị chỉ những properties được lọc với tên tiếng Việt
 */
export function generateFilteredInfoHTML(
  properties: PropertyBag | undefined,
  time: JulianDate,
  showStringIfPropertyValueIsNull: string | undefined
) {
  let html = "";
  if (typeof properties?.getValue === "function") {
    properties = properties.getValue(time);
  }

  if (!isDefined(properties)) return undefined;

  if (typeof properties === "object") {
    // Chỉ lặp qua các trường được định nghĩa trong FILTERED_PROPERTIES
    for (const key in FILTERED_PROPERTIES) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        let value = properties[key];
        if (isDefined(showStringIfPropertyValueIsNull) && !isDefined(value)) {
          value = showStringIfPropertyValueIsNull;
        }
        if (isDefined(value)) {
          if (typeof value.getValue === "function") {
            value = value.getValue(time);
          }

          // Sử dụng tên tiếng Việt từ FILTERED_PROPERTIES
          const displayName = FILTERED_PROPERTIES[key];

          if (typeof value === "object" && !Array.isArray(value)) {
            html +=
              "<tr><th>" +
              displayName +
              "</th><td>" +
              generateFilteredInfoHTML(
                value,
                time,
                showStringIfPropertyValueIsNull
              ) +
              "</td></tr>";
          } else {
            html +=
              "<tr><th>" + displayName + "</th><td>" + value + "</td></tr>";
          }
        }
      }
    }
  }

  if (html.length > 0) {
    html =
      '<table class="cesium-infoBox-defaultTable"><tbody>' +
      html +
      "</tbody></table>";
  }
  return html;
}
