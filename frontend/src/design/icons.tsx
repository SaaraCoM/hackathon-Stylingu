import type {SVGProps} from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({children, ...props}: IconProps) {
 return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{children}</svg>;
}

/** The brand mark: a ribbon bow, never a clover. */
export function BowIcon(props: IconProps) {
 return <Icon {...props}>
  <path d="M12 11.4C9.8 8.3 5.8 6.2 4.1 8.3c-1.6 2 .4 5.2 7.9 3.1"/>
  <path d="M12 11.4c2.2-3.1 6.2-5.2 7.9-3.1 1.6 2-.4 5.2-7.9 3.1"/>
  <path d="M12 12.4c-1 2.4-2.5 4.5-4.4 6.1"/>
  <path d="M12 12.4c1 2.4 2.5 4.5 4.4 6.1"/>
  <circle cx="12" cy="11.5" r="1.15" fill="currentColor" stroke="none"/>
 </Icon>;
}

export function PaletteIcon(props: IconProps) {
 return <Icon {...props}>
  <path d="M12 3a9 9 0 1 0 0 18c1.3 0 2.2-.9 2.2-2 0-1.1-.9-1.6-.9-2.7 0-1 .8-1.8 1.9-1.8h1.6A4.2 4.2 0 0 0 21 10.3C20.7 6.2 16.8 3 12 3Z"/>
  <circle cx="7.6" cy="10.2" r="1" fill="currentColor" stroke="none"/>
  <circle cx="10" cy="6.7" r="1" fill="currentColor" stroke="none"/>
  <circle cx="14.3" cy="6.7" r="1" fill="currentColor" stroke="none"/>
  <circle cx="17" cy="9.8" r="1" fill="currentColor" stroke="none"/>
 </Icon>;
}

export function SparkleIcon(props: IconProps) {
 return <Icon {...props}>
  <path d="M11 3.5 12.6 8.4 17.5 10 12.6 11.6 11 16.5 9.4 11.6 4.5 10 9.4 8.4 11 3.5Z"/>
  <path d="M18 14.5 18.8 17 21.3 17.8 18.8 18.6 18 21.1 17.2 18.6 14.7 17.8 17.2 17 18 14.5Z"/>
 </Icon>;
}

export function HomeIcon(props: IconProps) {
 return <Icon {...props}><path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1Z"/></Icon>;
}

export function HangerIcon(props: IconProps) {
 return <Icon {...props}><path d="M12 7.6a2.2 2.2 0 1 1 2.2-2.2"/><path d="M12 7.6v2.2L3.8 14.5a2 2 0 0 0 1 3.7h14.4a2 2 0 0 0 1-3.7Z"/></Icon>;
}

export function BagIcon(props: IconProps) {
 return <Icon {...props}><path d="M5 8h14l1 12H4Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></Icon>;
}

export function BellIcon(props: IconProps) {
 return <Icon {...props}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>;
}

export function MenuIcon(props: IconProps) {
 return <Icon {...props}><path d="M4 7h16M4 12h16M4 17h10"/></Icon>;
}

export function SearchIcon(props: IconProps) {
 return <Icon {...props}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></Icon>;
}

export function ChevronIcon(props: IconProps) {
 return <Icon {...props}><path d="m9 5 7 7-7 7"/></Icon>;
}

export function CloseIcon(props: IconProps) {
 return <Icon {...props}><path d="m6 6 12 12M18 6 6 18"/></Icon>;
}

export function CameraIcon(props: IconProps) {
 return <Icon {...props}><path d="M4 8h3l1.5-2h7L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.2"/></Icon>;
}

export function ArrowIcon(props: IconProps) {
 return <Icon {...props}><path d="M4 12h15M13 6l6 6-6 6"/></Icon>;
}
