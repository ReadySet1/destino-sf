import { HeroBanner } from './components/HeroBanner';
import { PopularEmpanadas } from './components/PopularEmpanadas';
import { MenuSection } from './components/MenuSection';

export default function Hero() {
  return (
    <div className="flex flex-col">
      <HeroBanner />
      {/* <PopularEmpanadas /> */}
      {/* <MenuSection /> */}
    </div>
  );
}
