#include <emscripten/bind.h>
#include <vector>

#include "Crc32.h"

std::array<unsigned char, 4> generateBinary(UInt32 startCrc, UInt32 wantedCrc)
{
  std::array<unsigned char, 4> result;
	Crc32 crc;

	crc.set(startCrc);

	const UInt8* patch = crc.findReverse(wantedCrc);

	crc.append(patch, 4);

  if (wantedCrc == crc.get())
  {
    result[0] = patch[0];
    result[1] = patch[1];
    result[2] = patch[2];
    result[3] = patch[3];
  }

	return result;
}

std::array<char, 6> generateAscii(UInt32 startCrc, UInt32 wantedCrc)
{
  std::array<char, 6> result;
	Crc32 crc;

	crc.set(startCrc);

	const char* patch = crc.findReverseAscii(wantedCrc);

	crc.append(patch, 6);

	if (wantedCrc == crc.get())
  {
    result[0] = patch[0];
    result[1] = patch[1];
    result[2] = patch[2];
    result[3] = patch[3];
    result[4] = patch[4];
    result[5] = patch[5];
  }

  return result;
}

EMSCRIPTEN_BINDINGS(reversecrc_web)
{
  emscripten::value_array<std::array<unsigned char, 4>>("array_unsigned_char_4")
    .element(emscripten::index<0>())
    .element(emscripten::index<1>())
    .element(emscripten::index<2>())
    .element(emscripten::index<3>());

  emscripten::value_array<std::array<char, 6>>("array_char_6")
    .element(emscripten::index<0>())
    .element(emscripten::index<1>())
    .element(emscripten::index<2>())
    .element(emscripten::index<3>())
    .element(emscripten::index<4>())
    .element(emscripten::index<5>());

  emscripten::function("generateBinary", &generateBinary);
  emscripten::function("generateAscii", &generateAscii);
}
