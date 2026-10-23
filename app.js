const originalData = Array.from({ length: 64 }, () => Math.floor(Math.random() * 256));
const currentData = [...originalData];
const STANDARD_POLYNOMIALS = {
  "CRC-4/ITU": "10011",
  "CRC-8": "100000111",
  "CRC-16/CCITT-FALSE": "10001000000100001",
  "CRC-16/ARC": "11000000000000101",
  "CRC-32/IEEE": "100000100110000010001110110110111",
};
const FRAME_CRC_STANDARDS = {
  "CRC-8": { width: 8, polynomial: 0x07, init: 0x00, refin: false, refout: false, xorout: 0x00 },
  "CRC-16/CCITT-FALSE": { width: 16, polynomial: 0x1021, init: 0xffff, refin: false, refout: false, xorout: 0x0000 },
  "CRC-16/ARC": { width: 16, polynomial: 0x8005, init: 0x0000, refin: true, refout: true, xorout: 0x0000 },
  "CRC-32/IEEE": { width: 32, polynomial: 0x04c11db7, init: 0xffffffff, refin: true, refout: true, xorout: 0xffffffff },
};
const dataGrid = document.querySelector("#data-grid");
const selectedByteLabel = document.querySelector("#selected-byte-label");
const selectedByteBits = document.querySelector("#selected-byte-bits");
const resetDataButton = document.querySelector("#reset-data");
const resultCard = document.querySelector("#crc-result");
const resultIcon = document.querySelector("#result-icon");
const resultTitle = document.querySelector("#result-title");
const resultDescription = document.querySelector("#result-description");
const framePolynomialSelect = document.querySelector("#frame-polynomial");
const polynomialSelect = document.querySelector("#polynomial-standard");
const polynomialInput = document.querySelector("#polynomial-input");
let selectedByte = 0;

function calculateCrc(bytes, standard) {
  const { width, polynomial, init, refin, refout, xorout } = standard;
  const mask = (2 ** width) - 1;
  const topBit = 2 ** (width - 1);
  const reflectedPolynomial = reverseBits(polynomial, width);
  let crc = init;

  for (const byte of bytes) {
    if (refin) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = ((crc >>> 1) ^ ((crc & 1) ? reflectedPolynomial : 0)) >>> 0;
      }
    } else {
      crc ^= byte * (2 ** (width - 8));
      for (let bit = 0; bit < 8; bit += 1) {
        crc = ((crc * 2) & mask) ^ ((crc & topBit) ? polynomial : 0);
      }
    }
  }
  if (refin !== refout) crc = reverseBits(crc, width);
  const result = crc ^ xorout;
  return width === 32 ? result >>> 0 : result & mask;
}

function reverseBits(value, width) {
  let reversed = 0;
  for (let bit = 0; bit < width; bit += 1) {
    reversed = (reversed * 2) | (value & 1);
    value = Math.floor(value / 2);
  }
  return reversed;
}

function formatCrc(value, width) {
  return `0x${value.toString(16).padStart(width / 4, "0").toUpperCase()}`;
}

function renderDataBlock() {
  const standardName = framePolynomialSelect.value;
  const standard = FRAME_CRC_STANDARDS[standardName];
  const originalCrc = calculateCrc(originalData, standard);
  const currentCrc = calculateCrc(currentData, standard);
  document.querySelector("#crc-standard-name").textContent = `${standardName} CHECKSUM`;
  document.querySelector("#frame-crc").textContent = formatCrc(currentCrc, standard.width);

  dataGrid.replaceChildren();
  currentData.forEach((byte, byteIndex) => {
    const byteButton = document.createElement("button");
    byteButton.type = "button";
    byteButton.className = "hex-byte";
    byteButton.textContent = byte.toString(16).padStart(2, "0").toUpperCase();
    byteButton.setAttribute(
      "aria-label",
      `Byte ${byteIndex}: 0x${byte.toString(16).padStart(2, "0").toUpperCase()}${byteIndex === selectedByte ? ", selected" : ""}`,
    );
    byteButton.setAttribute("aria-pressed", String(byteIndex === selectedByte));
    if (byteIndex === selectedByte) byteButton.classList.add("is-selected");
    if (byte !== originalData[byteIndex]) byteButton.classList.add("is-changed");
    byteButton.addEventListener("click", () => {
      selectedByte = byteIndex;
      renderDataBlock();
    });
    dataGrid.append(byteButton);
  });

  const selectedValue = currentData[selectedByte];
  selectedByteLabel.textContent =
    `BYTE ${String(selectedByte).padStart(2, "0")} · 0x${selectedValue.toString(16).padStart(2, "0").toUpperCase()}`;
  selectedByteBits.replaceChildren();
  for (let bitIndex = 7; bitIndex >= 0; bitIndex -= 1) {
    const bitValue = (selectedValue >> bitIndex) & 1;
    const isFlipped = bitValue !== ((originalData[selectedByte] >> bitIndex) & 1);
    const bitButton = document.createElement("button");
    bitButton.type = "button";
    bitButton.className = "data-bit";
    bitButton.textContent = String(bitValue);
    bitButton.setAttribute("aria-label", `Byte ${selectedByte}, bit ${bitIndex}, value ${bitValue}`);
    bitButton.setAttribute("aria-pressed", String(isFlipped));
    if (isFlipped) bitButton.classList.add("is-flipped");
    bitButton.addEventListener("click", () => {
      currentData[selectedByte] ^= 1 << bitIndex;
      renderDataBlock();
    });
    selectedByteBits.append(bitButton);
  }

  const changedBitCount = originalData.reduce((count, byte, index) => {
    let differences = byte ^ currentData[index];
    while (differences !== 0) {
      count += differences & 1;
      differences >>>= 1;
    }
    return count;
  }, 0);
  const isChanged = changedBitCount > 0;
  resultCard.classList.toggle("is-changed", isChanged);
  resultCard.classList.toggle("is-undetected", isChanged && currentCrc === originalCrc);
  resultIcon.textContent = isChanged ? (currentCrc === originalCrc ? "×" : "!") : "✓";
  if (isChanged) {
    if (currentCrc === originalCrc) {
      resultTitle.textContent = `Undetected error pattern · CRC remains ${formatCrc(currentCrc, standard.width)}`;
      resultDescription.textContent =
        `${changedBitCount} bits changed, but this pattern has the same CRC. Some multi-bit error patterns can go undetected.`;
    } else {
      resultTitle.textContent =
        `CRC changed: ${formatCrc(originalCrc, standard.width)} → ${formatCrc(currentCrc, standard.width)}`;
      resultDescription.textContent = `${changedBitCount} bit${changedBitCount === 1 ? "" : "s"} flipped across the data block.`;
    }
  } else {
    resultTitle.textContent = `Original data · CRC ${formatCrc(originalCrc, standard.width)}`;
    resultDescription.textContent = "Select any hex byte above, then flip its bits to recalculate the CRC.";
  }
}

resetDataButton.addEventListener("click", () => {
  currentData.splice(0, currentData.length, ...originalData);
  renderDataBlock();
});
framePolynomialSelect.addEventListener("change", renderDataBlock);

let divisionState = null;
let divisionCursor = 0;
let divisionPhase = 0;

function buildDivision(dividendBits, divisorBits) {
  const degree = divisorBits.length - 1;
  const working = [...dividendBits];
  const actions = [];

  for (let position = 0; position <= dividendBits.length - divisorBits.length; position += 1) {
    const before = working.join("");
    const didXor = working[position] === "1";
    if (didXor) {
      for (let offset = 0; offset < divisorBits.length; offset += 1) {
        working[position + offset] =
          String(Number(working[position + offset]) ^ Number(divisorBits[offset]));
      }
    }
    actions.push({
      position,
      before,
      after: working.join(""),
      windowBefore: before.slice(position, position + divisorBits.length),
      windowAfter: working.slice(position, position + divisorBits.length).join(""),
      didXor,
    });
  }

  return {
    initialBits: dividendBits,
    actions,
    quotient: actions.map((action) => Number(action.didXor)).join(""),
    remainder: working.slice(-degree).join(""),
  };
}

function renderDivisionTape(container, bits, windowStart, windowLength, kind) {
  container.replaceChildren();
  container.className = `bit-tape ${kind}`;
  const label = kind === "working-tape"
    ? "Current working bits"
    : kind === "quotient-tape"
      ? "Running quotient bits"
      : "Generator divisor";
  container.setAttribute("aria-label", label);
  for (let position = 0; position < bits.length; position += 1) {
    const bit = document.createElement("span");
    bit.className = "bit-cell";
    bit.textContent = bits[position] || "\u00a0";
    if (position >= windowStart && position < windowStart + windowLength) {
      bit.classList.add("xor-window");
    }
    container.append(bit);
  }
}

function renderDivisionPlayer() {
  const { message, divisor, phases, quotient, remainder, codeword } = divisionState;
  const phase = phases[divisionPhase];
  const { initialBits, actions, remainder: phaseRemainder } = phase;
  const isComplete = divisionCursor >= actions.length;
  const action = isComplete ? null : actions[divisionCursor];
  const previousAction = divisionCursor > 0 ? actions[divisionCursor - 1] : null;
  const workingBits = divisionCursor === 0
    ? initialBits
    : previousAction.after;
  const windowPosition = action?.position ?? actions.at(-1).position;
  const windowLength = divisor.length;

  renderDivisionTape(
    document.querySelector("#quotient-bits"),
    `${phase.quotient.slice(0, divisionCursor)}${" ".repeat(actions.length - divisionCursor)}${" ".repeat(divisor.length - 1)}`,
    0,
    message.length,
    "quotient-tape",
  );
  renderDivisionTape(
    document.querySelector("#working-bits"),
    workingBits,
    windowPosition,
    windowLength,
    "working-tape",
  );

  const divisorRow = Array.from(workingBits, (_bit, position) => {
    const divisorPosition = position - windowPosition;
    return divisorPosition >= 0 && divisorPosition < divisor.length
      ? divisor[divisorPosition]
      : " ";
  }).join("");
  renderDivisionTape(
    document.querySelector("#divisor-bits"),
    divisorRow,
    windowPosition,
    windowLength,
    "divisor-tape",
  );

  const actionMessage = document.querySelector("#division-action");
  const equation = document.querySelector("#operation-equation");
  const runningRemainder = document.querySelector("#running-remainder");
  const processedRemainder = previousAction
    ? previousAction.windowAfter.slice(1)
    : "";
  runningRemainder.textContent = isComplete
    ? phaseRemainder
    : processedRemainder || "—";
  if (divisionPhase === 0) {
    document.querySelector(".walkthrough-heading h3").textContent = "Watch the CRC calculation.";
  } else {
    document.querySelector(".walkthrough-heading h3").textContent = "Check the transmitted codeword.";
  }

  if (isComplete) {
    actionMessage.textContent = divisionPhase === 0
      ? "CRC calculated. Next, divide the transmitted codeword and follow its remainder to zero."
      : phaseRemainder === "0".repeat(divisor.length - 1)
        ? "Codeword check complete. The remainder is all zeroes."
        : `Codeword check complete. The remainder is ${phaseRemainder}, not zero.`;
    equation.textContent = previousAction?.didXor
      ? `Last XOR result: ${previousAction.windowBefore} ⊕ ${divisor} = ${previousAction.windowAfter}`
      : `Last quotient bit is 0, so no XOR was needed at the final position.`;
  } else if (action.didXor) {
    actionMessage.textContent =
      `${divisionPhase === 0 ? "CRC generation" : "Codeword check"} · position ${action.position} of ${actions.length - 1}: bit is 1, so XOR this window with the divisor (quotient bit 1), then shift the divisor right one bit.`;
    equation.textContent = divisionCursor === 0
      ? "The divisor is aligned under the highlighted window. Press “Next step” to XOR."
      : previousAction.didXor
        ? `XOR result: ${previousAction.windowBefore} ⊕ ${divisor} = ${previousAction.windowAfter}`
        : `Quotient bit ${previousAction.position} = 0; the window moved without an XOR.`;
  } else {
    actionMessage.textContent =
      `${divisionPhase === 0 ? "CRC generation" : "Codeword check"} · position ${action.position} of ${actions.length - 1}: bit is 0, so the quotient bit is 0; skip the XOR and shift the divisor right one bit.`;
    equation.textContent = divisionCursor === 0
      ? "The divisor is aligned under the highlighted window. Press “Next step” to begin."
      : previousAction.didXor
        ? `XOR result: ${previousAction.windowBefore} ⊕ ${divisor} = ${previousAction.windowAfter}`
        : `Quotient bit ${previousAction.position} = 0; the window moved without an XOR.`;
  }

  const completedXors = actions
    .slice(0, divisionCursor)
    .filter((item) => item.didXor).length;
  document.querySelector("#division-progress").textContent = isComplete
    ? `${actions.length} positions · ${actions.filter((item) => item.didXor).length} XORs · ${divisionPhase === 0 ? "CRC ready" : "check complete"}`
    : `${divisionPhase === 0 ? "CRC" : "Check"} · bit ${action.position} of ${actions.length - 1} · ${completedXors} XORs`;
  document.querySelector("#previous-step").disabled = divisionCursor === 0 && divisionPhase === 0;
  document.querySelector("#next-step").disabled = isComplete && divisionPhase === phases.length - 1;
  document.querySelector("#next-step").textContent = isComplete
    ? divisionPhase === 0 ? "Check codeword →" : "Calculation complete"
    : "Next step →";

  const finalResult = document.querySelector("#final-result");
  finalResult.hidden = divisionPhase === 0 && !isComplete;
  if (divisionPhase === 0 && isComplete) {
    document.querySelector("#quotient-value").textContent = quotient;
    document.querySelector("#remainder-value").textContent = remainder;
    document.querySelector("#codeword-value").textContent = codeword;
    document.querySelector("#verify-result").textContent = "Next: divide the transmitted codeword and check its remainder.";
  } else if (divisionPhase > 0) {
    document.querySelector("#verify-result").textContent = isComplete
      ? phaseRemainder === "0".repeat(divisor.length - 1)
        ? "✓ Codeword check\nremainder = 0"
        : `Codeword check remainder = ${phaseRemainder}`
      : `Codeword check in progress\nremainder = ${runningRemainder.textContent}`;
  }
}

function renderDivision() {
  const message = document.querySelector("#message-input").value.trim();
  const divisor = polynomialInput.value.trim();
  const error = document.querySelector("#lab-error");

  if (!/^[01]{16}$/.test(message)) {
    error.textContent = "Enter exactly 16 message bits (0 or 1).";
    error.hidden = false;
    return;
  }
  if (!/^[01]{2,33}$/.test(divisor) || divisor[0] !== "1" || divisor.at(-1) !== "1") {
    error.textContent = "Enter a 2–33 bit binary polynomial that starts and ends with 1.";
    error.hidden = false;
    return;
  }

  error.hidden = true;
  const degree = divisor.length - 1;
  const initialBits = `${message}${"0".repeat(degree)}`;
  const generation = buildDivision(initialBits, divisor);
  const codeword = `${message}${generation.remainder}`;
  const verification = buildDivision(codeword, divisor);

  document.querySelector("#overview-message").textContent = message;
  document.querySelector("#overview-zeros").textContent = "0".repeat(degree);
  document.querySelector("#overview-divisor").textContent = divisor;
  divisionState = {
    message,
    divisor,
    phases: [generation, verification],
    quotient: generation.quotient,
    remainder: generation.remainder,
    codeword,
  };
  divisionPhase = 0;
  divisionCursor = 0;
  renderDivisionPlayer();
}

document.querySelector("#calculate-button").addEventListener("click", renderDivision);
document.querySelector("#next-step").addEventListener("click", () => {
  const phase = divisionState.phases[divisionPhase];
  if (divisionCursor < phase.actions.length) {
    divisionCursor += 1;
  } else if (divisionPhase < divisionState.phases.length - 1) {
    divisionPhase += 1;
    divisionCursor = 0;
  }
  renderDivisionPlayer();
});
document.querySelector("#previous-step").addEventListener("click", () => {
  if (divisionCursor > 0) {
    divisionCursor -= 1;
  } else if (divisionPhase > 0) {
    divisionPhase -= 1;
    divisionCursor = divisionState.phases[divisionPhase].actions.length;
  }
  renderDivisionPlayer();
});
document.querySelector("#reset-division").addEventListener("click", () => {
  divisionPhase = 0;
  divisionCursor = 0;
  renderDivisionPlayer();
});
polynomialSelect.addEventListener("change", () => {
  const divisor = STANDARD_POLYNOMIALS[polynomialSelect.value];
  if (divisor) {
    polynomialInput.value = divisor;
    renderDivision();
  }
});
polynomialInput.addEventListener("input", () => {
  const selectedStandard = Object.entries(STANDARD_POLYNOMIALS)
    .find(([, divisor]) => divisor === polynomialInput.value.trim());
  polynomialSelect.value = selectedStandard ? selectedStandard[0] : "Custom";
});
document.querySelector("#message-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter") renderDivision();
});
polynomialInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") renderDivision();
});

renderDataBlock();
renderDivision();
