export type Requirement = { id: string; title: string; sourceWords: number; text: string };
export type RequirementGroup = { id: string; title: string; sourceWords: number; requirements: Requirement[] };

export const SBC_GROUPS: RequirementGroup[] = [
  {
    id: "01", title: "Purpose & intelligence", sourceWords: 65, requirements: [
      { id: "S01", title: "Purpose", sourceWords: 16, text: "Design a single board computer that can be used for home automation within a residential environment." },
      { id: "S02", title: "Assistant workflow", sourceWords: 34, text: "The computer will run a version of Home Assistant OS, and act as a Claude-based assistant in the home, receiving requests from the device, sending to Claude to process, then responding text to speech." },
      { id: "S03", title: "SoC selection", sourceWords: 15, text: "Pick a SoC that's publicly available for use and meets the interface and performance requirements." },
    ],
  },
  {
    id: "02", title: "Hardware & connectivity", sourceWords: 64, requirements: [
      { id: "S04", title: "Physical interfaces", sourceWords: 28, text: "The device should have USB-A ports for connecting radios and other peripherals, an embedded microphone for listening to surroundings, and a speaker interface (header) for responding to requests." },
      { id: "S05", title: "Wireless", sourceWords: 12, text: "The system should have 5GHz and 2.4GHz wifi as well as bluetooth." },
      { id: "S06", title: "Optional radio", sourceWords: 7, text: "Zigbee embedded is a nice to have." },
      { id: "S07", title: "Power", sourceWords: 10, text: "It should be powered off of a USB-C PD port." },
      { id: "S08", title: "Storage", sourceWords: 7, text: "Storage can be a micro SD card." },
    ],
  },
  {
    id: "03", title: "Engineering deliverables", sourceWords: 43, requirements: [
      { id: "S09", title: "PCB + enclosure", sourceWords: 19, text: "Design the circuit board including the mechanical outline..., and a 3d printed enclosure (stl / 3mf) for the device." },
      { id: "S10", title: "System image", sourceWords: 24, text: "prepare an image (iso) to be applied onto the SD card which is configured to run on the hardware and pulls the latest HaOS." },
    ],
  },
  {
    id: "04", title: "Final objective", sourceWords: 16, requirements: [
      { id: "S11", title: "Manufacturing readiness", sourceWords: 16, text: "Keep working end to end until you have a fully US-sourceable and ready to manufacture board." },
    ],
  },
];

export const SBC_REQUIREMENTS = SBC_GROUPS.flatMap((group) => group.requirements);
export const SBC_SOURCE_WORDS = SBC_GROUPS.reduce((sum, group) => sum + group.sourceWords, 0);
export const SBC_SEMANTIC_FIELDS = [
  { name: "Actor", value: "Designer", note: "Implied actor" },
  { name: "Action", value: "Design" },
  { name: "Object", value: "Single-board PC" },
  { name: "Condition", value: "Residential setting" },
  { name: "Modality", value: "Imperative" },
  { name: "Result", value: "Home automation use" },
] as const;
