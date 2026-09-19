import { Injectable } from '@nestjs/common';
import { calculateSummaryProfit, calculateTotalCost } from '../utils/costCalculator';
import { DispatchService } from './dispatch.service';
@Injectable()
export class CostService {
  private rows = [{ id: 1, vehicleId: 1, month: '2026-06', fuelTotal: 1776, maintenanceTotal: 2100, tollTotal: 420, laborTotal: 2500, fixedCost: 7800, totalCost: 14596, totalRevenue: 22600, profit: 8004 }];
  constructor(private readonly dispatchService: DispatchService) {}
  findAll() { return this.rows; }
  findOne(id: number) { return this.rows.find((item: any) => item.id === id); }
  create(payload: any) { const row = { ...payload, id: this.rows.length + 1 }; this.rows.push(row); return row; }
  // 维保费用按完成月份写入汇总，并重算总成本、总收入与利润
  applyMaintenanceCost(vehicleId: number, month: string, cost: number) {
    let summary = this.rows.find((item: any) => item.vehicleId === vehicleId && item.month === month);
    if (!summary) {
      summary = { id: this.rows.length + 1, vehicleId, month, fuelTotal: 0, maintenanceTotal: 0, tollTotal: 0, laborTotal: 0, fixedCost: 0, totalCost: 0, totalRevenue: 0, profit: 0 };
      this.rows.push(summary);
    }
    summary.maintenanceTotal += cost;
    summary.totalRevenue = this.dispatchService.sumCompletedFreight(vehicleId, month);
    summary.totalCost = calculateTotalCost(summary.fuelTotal, summary.maintenanceTotal, summary.tollTotal, summary.laborTotal, summary.fixedCost);
    summary.profit = calculateSummaryProfit(summary.totalRevenue, summary.totalCost);
    return summary;
  }
}
