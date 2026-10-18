import type { Visual } from '../../core/types';
import PlaceValueVisual from './PlaceValueVisual';
import NumberLineVisual from './NumberLineVisual';
import DotArrayVisual from './DotArrayVisual';
import WrittenVisual from './WrittenVisual';
import GridVisual from './GridVisual';
import SolidVisual from './SolidVisual';
import ShapeVisual from './ShapeVisual';
import NetVisual from './NetVisual';
import CubeBuildingVisual from './CubeBuildingVisual';
import BarChartVisual from './BarChartVisual';
import PictogramVisual from './PictogramVisual';
import TallyVisual from './TallyVisual';
import SpinnerVisual from './SpinnerVisual';
import BagVisual from './BagVisual';
import DiceVisual from './DiceVisual';
import TreeVisual from './TreeVisual';
import TableVisual from './TableVisual';
import ClockVisual from './ClockVisual';
import MoneyVisual from './MoneyVisual';
import RulerVisual from './RulerVisual';
import ContainerVisual from './ContainerVisual';
import ScaleVisual from './ScaleVisual';

/** Dispatches a declarative Visual to its SVG/HTML renderer. */
export default function VisualView({ visual, print }: { visual: Visual; print?: boolean }) {
  switch (visual.type) {
    case 'placeValue':
      return <PlaceValueVisual visual={visual} print={print} />;
    case 'numberLine':
      return <NumberLineVisual visual={visual} print={print} />;
    case 'dotArray':
      return <DotArrayVisual visual={visual} print={print} />;
    case 'written':
      return <WrittenVisual visual={visual} print={print} />;
    case 'grid':
      return <GridVisual visual={visual} print={print} />;
    case 'solid':
      return <SolidVisual visual={visual} print={print} />;
    case 'shape':
      return <ShapeVisual visual={visual} print={print} />;
    case 'net':
      return <NetVisual visual={visual} print={print} />;
    case 'cubeBuilding':
      return <CubeBuildingVisual visual={visual} print={print} />;
    case 'barChart':
      return <BarChartVisual visual={visual} print={print} />;
    case 'pictogram':
      return <PictogramVisual visual={visual} print={print} />;
    case 'tally':
      return <TallyVisual visual={visual} print={print} />;
    case 'spinner':
      return <SpinnerVisual visual={visual} print={print} />;
    case 'bag':
      return <BagVisual visual={visual} print={print} />;
    case 'dice':
      return <DiceVisual visual={visual} print={print} />;
    case 'tree':
      return <TreeVisual visual={visual} print={print} />;
    case 'table':
      return <TableVisual visual={visual} print={print} />;
    case 'clock':
      return <ClockVisual visual={visual} print={print} />;
    case 'money':
      return <MoneyVisual visual={visual} print={print} />;
    case 'ruler':
      return <RulerVisual visual={visual} print={print} />;
    case 'container':
      return <ContainerVisual visual={visual} print={print} />;
    case 'scale':
      return <ScaleVisual visual={visual} print={print} />;
  }
}
