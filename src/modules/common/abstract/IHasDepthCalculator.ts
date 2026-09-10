import { Point } from "../../../core/types/Point";
import { IHasPoints } from "./IHasPoints";

export interface IHasDepthCalculator {
  getDepthAtPoint(point: Point): number;
  getDepthAtPointClip(points: Point[]): number;
  checkCollision(object: IHasPoints, points: Point[] | null): boolean;
};