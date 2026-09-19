import { Injectable } from '@nestjs/common';
import { recalculateCostSummary } from '../utils/costCalculator';
@Injectable()
export class CostService {
  private rows = [{ id: 1, vehicleId: 1, month: '2026-06', fuelTotal: 1776, maintenanceTotal: 2100, tollTotal: 420, laborTotal: 2500, fixedCost: 7800, totalCost: 14596, totalRevenue: 22600, profit: 8004 }];
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  findByVehicleAndMonth(vehicleId: number, month: string) {
    return this.rows.find((item: any) => item.vehicleId === vehicleId && item.month === month);
  }
  applyMaintenanceCost(vehicleId: number, month: string, amount: number) {
    let row = this.findByVehicleAndMonth(vehicleId, month);
    if (!row) {
      row = { id: this.rows.length + 1, vehicleId, month, fuelTotal: 0, maintenanceTotal: 0, tollTotal: 0, laborTotal: 0, fixedCost: 0, totalCost: 0, totalRevenue: 0, profit: 0 };
      this.rows.push(row);
    }
    row.maintenanceTotal += amount;
    const recalculated = recalculateCostSummary(row);
    row.totalCost = recalculated.totalCost;
    row.totalRevenue = recalculated.totalRevenue;
    row.profit = recalculated.profit;
    return row;
  }
  snapshotSummary(vehicleId: number, month: string) {
    const row = this.findByVehicleAndMonth(vehicleId, month);
    return row ? { ...row } : null;
  }
  restoreSummary(vehicleId: number, month: string, snapshot: any) {
    const index = this.rows.findIndex((item: any) => item.vehicleId === vehicleId && item.month === month);
    if (snapshot === null) {
      if (index >= 0) this.rows.splice(index, 1);
      return;
    }
    if (index >= 0) Object.assign(this.rows[index], snapshot);
    else this.rows.push(snapshot);
  }
}
