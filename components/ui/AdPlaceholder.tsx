export default function AdPlaceholder({
  className = "",
  size = "banner",
}: {
  label?: string;
  className?: string;
  size?: "banner" | "square" | "sidebar";
}) {
  void size;
  void className;
  return null;
}
