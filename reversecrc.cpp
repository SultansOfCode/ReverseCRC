#include <stdio.h>
#include <stdlib.h>
#include "Crc32.h"

void generateBinary(UInt32 startCrc, UInt32 wantedCrc)
{
	Crc32 crc;

	crc.set(startCrc);

	const UInt8* patch = crc.findReverse(wantedCrc);

	crc.append(patch, 4);

	printf("          initial: 0x%.8x\n", startCrc);
	printf("           target: 0x%.8x\n", wantedCrc);
	printf("           status: %s\n", (wantedCrc == crc.get() ? "OK" : "FAIL"));
	printf("     bytes to add: 0x%.2x 0x%.2x 0x%.2x 0x%.2x\n", patch[0], patch[1], patch[2], patch[3]);
}

void generateAscii(UInt32 startCrc, UInt32 wantedCrc)
{
	Crc32 crc;

	crc.set(startCrc);

	const char* patch = crc.findReverseAscii(wantedCrc);

	crc.append(patch, 6);

	printf("          initial: 0x%.8x\n", startCrc);
	printf("           target: 0x%.8x\n", wantedCrc);
	printf("           status: %s\n", (wantedCrc == crc.get() ? "OK" : "FAIL"));
	printf("    string to add: %s\n", patch);
}

int main(int argc, char* argv[])
{
	UInt32 startCrc = strtoul(argv[1], NULL, 16);
	UInt32 wantedCrc = strtoul(argv[2], NULL, 16);

	generateBinary(startCrc, wantedCrc);

	printf("\n");

	generateAscii(startCrc, wantedCrc);

	return 0;
}
