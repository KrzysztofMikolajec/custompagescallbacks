# custompagescallbacks
Power Apps Custom Page Dialogs in Model-Driven Apps: Passing &amp; Receiving Data

---

### ⚙️ Prerequisites

Before wiring everything up, make sure you have the following in place:

---

**✅ 1. Create or Import the `cu_custompagescallback` Table**

This custom table is used for storing the return values from your dialog (the callback). It must include at least these two columns:

| Column Logical Name | Type           | Purpose                              |
|---------------------|----------------|--------------------------------------|
| `cu_sessionid`      | Single Line Text | Used to uniquely identify the dialog session |
| `cu_callbackjson`   | Multiline Text | Stores the data returned from the dialog as JSON |

👉 You can import the solution from my GitHub repo to automatically deploy this table to your environment.

---

**✅ 2. Create the Custom Page**

You’ll need a Custom Page in your solution that acts as the dialog. This page should:

- Read data from `Param("recordId")` and parse it using `ParseJSON()`
- Store results using a `Patch()` to the `cu_custompagescallback` table using the sessionId passed in
- Call `Back()` after submitting

✅ Make sure your custom page is added to your **Model-Driven App** using the App Designer.

> You can adapt the following Power Fx for the button:

```powerfx
Patch(
  cu_custompagescallback,
  Defaults(cu_custompagescallback),
  {
    cu_sessionid: gblSessionId,
    cu_callbackjson: JSON({ Status: drpStatus.Selected.Value })
  }
);
Back();
```

---

### 🛠️ How to Wire It Up (Minimal Steps to Be Awesome)

Here’s the minimal setup to make this pattern work with any button in your model-driven app:

---

**1️⃣ Upload your Web Resource**

Upload `CustomPageHandler.js` to your environment as a Web Resource.

---

**2️⃣ Register Your Callback**

After the Web Resource loads, register your callback:

```js
// after your Web Resource loads...
CustomPageHandler.callbacks.myHandler = function(input) {
  // input.formContext, input.callbackData, input.entityName, input.recordId
  console.log("Got callback data:", input.callbackData);
  
  const status = input.callbackData.Status;

  if (status === "Rejected") {
    input.formContext.getAttribute("statecode").setValue(1); // Inactive
  } else if (status === "Approved") {
    input.formContext.getAttribute("statuscode").setValue(865420001);
  }

  input.formContext.data.save();
};
```

---

**3️⃣ Add or Edit Your Button**

Use **Power Apps Command Designer** (modern) or **Ribbon Workbench** (classic) to add your button and link it to the handler.

- **Library**: `CustomPageHandler.js`
- **Function Name**: `CustomPageHandler.launch`
- **Parameters** (in exact order):

  | Type          | Description                                                   |
  |---------------|---------------------------------------------------------------|
  | `PrimaryControl` | Execution context (automatically passed)                   |
  | `String`         | Callback key (e.g., `"myHandler"`)                         |
  | `String`         | Custom Page Name (e.g., `"my_custom_page"`)               |
  | `String`         | JSON with navigation options                               |
  | `String`         | JSON with additional parameters (or `"{}"` if none)       |

---

**📦 Sample Navigation Options JSON:**

```json
{
  "target": 2,
  "position": 1,
  "width": { "value": 680, "unit": "px" },
  "height": { "value": 280, "unit": "px" },
  "title": "Delete Ticket"
}
```

---

🎉 Done! Now, every button just calls the same `CustomPageHandler.launch(...)` with its own parameters, and your business logic stays cleanly organized in the `CustomPageHandler.callbacks` map.

This makes it *easy to reuse, extend, and maintain* across multiple dialogs in your apps.

---
