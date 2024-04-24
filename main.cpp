#include <stdio.h>
#include "Crc32.h"


void testOne(UInt32 startCrc, UInt32 wantedCrc)
{
    Crc32 crc;

    crc.set(startCrc);

    const UInt8* patch = crc.findReverse(wantedCrc);
    crc.append(patch, 4);

    printf("    initial: 0x%.8x %s -  bytes to add: { 0x%.2x, 0x%.2x, 0x%.2x, 0x%.2x }\n",
           startCrc, (wantedCrc == crc.get() ? "OK  " : "FAIL"),
           patch[0], patch[1], patch[2], patch[3]);
}

void testMany(UInt32 wantedCrc, UInt32 count)
{
    UInt32 startCrc = 7;

    printf("\n\nCRC Test - Wanted output: 0x%.8x\n\n", wantedCrc);
    for (UInt32 i = 0; i < count; ++i) {
        testOne(startCrc, wantedCrc);
        startCrc *= 51;
    }
}

void testOneAscii(UInt32 startCrc, UInt32 wantedCrc)
{
    Crc32 crc;

    crc.set(startCrc);

    const char* patch = crc.findReverseAscii(wantedCrc);
    crc.append(patch, 6);

    printf("    initial: 0x%.8x %s -  string to add: %s\n",
           startCrc, (wantedCrc == crc.get() ? "OK  " : "FAIL"), patch);
}

void testManyAscii(UInt32 wantedCrc, UInt32 count)
{
    UInt32 startCrc = 7;

    printf("\n\nCRC Test ASCII - Wanted output: 0x%.8x\n\n", wantedCrc);
    for (UInt32 i = 0; i < count; ++i) {
        testOneAscii(startCrc, wantedCrc);
        startCrc *= 51;
    }
}
int main(void)
{
    testMany(0x00000000, 100);
    testMany(0xaaaaaaaa, 100);
    testMany(0x12345678, 100);
    testMany(0xffffffff, 100);

    testManyAscii(0x00000000, 100);
    testManyAscii(0xaaaaaaaa, 100);
    testManyAscii(0x12345678, 100);
    testManyAscii(0xffffffff, 100);

    // testOneAscii(0x2C395692, 0xAABBCCDD);

    testOne(0x4a2ca8a1, 0x44f2b129);
    testOneAscii(0x4a2ca8a1, 0x44f2b129);

    testOne(0xE5B237A3, 0x77cffdb8);
    testOneAscii(0xE5B237A3, 0x77cffdb8);

    return 0;
}
