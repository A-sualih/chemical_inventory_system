# Disposal Method Tracking: Testing Walkthrough

This guide provides step-by-step instructions to verify the implementation of the new disposal tracking features, specialized workflows, and data integrity.

## Prerequisites
- **Role**: You must be logged in as a user with `Admin`, `Lab Manager`, or `Safety Officer` permissions to access all features.
- **Data**: Ensure you have at least one chemical in stock (ideally an Acid like **Nitric Acid** to test the Neutralization workflow).

---

## 1. Test Neutralization Workflow

### Step A: Create Request
1. Navigate to **Waste Management** > **Disposal Logs**.
2. Click **Log New Disposal**.
3. Select an Acidic chemical (e.g., Nitric Acid).
4. Set Method to **Neutralization**.
5. Enter a quantity and submit.

### Step B: Approve Request
1. As an Officer/Admin, find the pending request and click **Approve**.
2. Verify the **FIFO Preview** shows which batches will be depleted.
3. Confirm approval.

### Step C: Finalize (The Workflow Test)
1. Find the approved request and click **Complete**.
2. **Verify UI Elements**:
   - [ ] **Safety Guidance**: Check if the orange box appears with specific instructions (e.g., "Incompatible with Organic solvents").
   - [ ] **pH Tracking**: Enter `Initial pH: 2.0` and `Final pH: 7.1`.
   - [ ] **Neutralizing Agent**: Enter "Sodium Bicarbonate".
3. **Compliance Check**:
   - [ ] Check the **Compatible Agents Verified** box.
   - [ ] Check the **Safe Disposal pH Validated** box.
4. Click **Confirm & Finalize**.
5. Click **View Details** on the completed record and verify all pH and verification data are correctly displayed.

---

## 2. Test Incineration Workflow

### Step A: Finalize Incineration
1. Create and approve a new disposal request with Method: **Incineration**.
2. Click **Complete** on the approved record.
3. **Verify UI Elements**:
   - [ ] **Temp Monitoring**: Enter `1250` in the **Burn Temp (°C)** field.
   - [ ] **Documentation**: Enter a **Certificate #** (e.g., `INC-2024-X99`).
   - [ ] **Gas Handling**: Check the **Hazardous gas scrubbing verified** box.
   - [ ] **Report Link**: Enter a URL in the **Final Disposal Report URL** field.
4. Click **Confirm & Finalize**.
5. Click **View Details** to verify the incineration-specific data is saved.

---

## 3. Test Delete & Inventory Restoration

### Scenario: Deleting a Pending Request
1. Note the current inventory level of a chemical (e.g., 500 mL).
2. Create a new disposal request for **100 mL**.
3. Verify the inventory level has dropped to **400 mL** (Immediate depletion on request).
4. Go back to **Disposal Logs** and find the pending request.
5. Click the red **Delete** button.
6. Confirm the deletion.
7. **Verification**:
   - [ ] Check the Chemical inventory again. It should be restored to **500 mL**.
   - [ ] Check **Inventory Logs** to see the "Disposal Record Deleted" entry.
