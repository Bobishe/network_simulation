import PaletteButton from "./PaletteButton";
import {
  CubeIcon,
  CubeTransparentIcon,
  HomeModernIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/solid";

const items = [
  { type: "leo", icon: CubeIcon, label: "Низкая орбита" },
  { type: "meo", icon: CubeTransparentIcon, label: "Средняя орбита" },
  { type: "geo", icon: CubeIcon, label: "Геостационарная орбита", ring: true },
  { type: "gnd", icon: HomeModernIcon, label: "Наземная станция" },
  { type: "link", icon: ArrowRightIcon, label: "Связь" },
];

export default function PaletteBar() {
  return (
    <div className="sticky left-0 top-12 z-10 bg-white flex flex-col items-center p-2 h-full w-20 border-r">
      {items.map((item) => (
        <PaletteButton
          key={item.type}
          icon={item.icon}
          label={item.label}
          type={item.type}
          ring={"ring" in item ? item.ring : undefined}
        />
      ))}
    </div>
  );
}
