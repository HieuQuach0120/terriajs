const InfoBoxCellName = {
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

export class InfoBoxUi {
  public container: HTMLElement;

  constructor() {
    this.container = document.createElement("table");
    this.container.className = "cesium-infoBox-defaultTable";

    // Binding
    this.renderTable = this.renderTable.bind(this);
    this.createTableItem = this.createTableItem.bind(this);
    this.renderStrTable = this.renderStrTable.bind(this);
    this.dispose = this.dispose.bind(this);
  }

  renderTable(tableData: string[][]) {
    const tbody = document.createElement("tbody");
    tableData.forEach((row) => {
      const rowHtml = this.createTableItem(row);
      tbody.appendChild(rowHtml);
    });
    this.container.appendChild(tbody);
    return this.container;
  }

  createTableItem(rowData: string[]) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");
    th.innerText = InfoBoxCellName[rowData[0] as keyof typeof InfoBoxCellName];
    td.innerText = rowData[1];
    tr.appendChild(th);
    tr.appendChild(td);
    return tr;
  }

  renderStrTable(tableData: string[]) {
    const container = document.createElement("table");
    container.className = "cesium-infoBox-defaultTable";
    const tbody = document.createElement("tbody");

    const tr = document.createElement("tr");
    const th = document.createElement("th");
    const td = document.createElement("td");
    th.innerText = tableData[0];
    td.innerText = tableData[1];
    tr.appendChild(th);
    tr.appendChild(td);
    tbody.appendChild(tr);

    container.appendChild(tbody);
    return container.outerHTML;
  }

  dispose() {
    this.container.replaceChildren();
  }
}
