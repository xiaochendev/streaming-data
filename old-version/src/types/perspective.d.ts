declare module '@jpmorganchase/perspective' {
  export class Table {
    update(data: any[]): void;
    schema(): Promise<any>;
  }
}
declare module '@jpmorganchase/perspective-viewer';
declare module '@jpmorganchase/perspective-viewer-highcharts';