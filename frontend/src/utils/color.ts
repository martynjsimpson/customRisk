export function getReadableTextColor(backgroundColor: string) {
  const red = parseInt(backgroundColor.slice(1, 3), 16);
  const green = parseInt(backgroundColor.slice(3, 5), 16);
  const blue = parseInt(backgroundColor.slice(5, 7), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? "#212529" : "#ffffff";
}
