import PaletteButton from "./PaletteButton";
import leoIcon from "../img/leo.png"
import MeoIcon from "../img/meo.png"
import GeoIcon from "../img/geo.png"
import EsIcon from "../img/es.png"
import HaspIcon from "../img/hasp.png"
import AsIcon from "../img/as.png"
import SsopIcon from "../img/ssop.png"




const items = [
  { type: "leo", icon: leoIcon, label: "Низкая орбита" },
  { type: "meo", icon: MeoIcon, label: "Средняя орбита" },
  { type: "geo", icon: GeoIcon, label: "Геостационарная орбита"},
  { type: "es", icon: EsIcon, label: "Наземная станция" },
  { type: "haps", icon: HaspIcon, label: "Высотная платформа" },
  { type: "as", icon: AsIcon, label: "Узел AS (абонент)" },
  { type: "ssop", icon: SsopIcon, label: "Узел SSOP (внешняя сеть)" },
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
        />
      ))}
    </div>
  );
}
