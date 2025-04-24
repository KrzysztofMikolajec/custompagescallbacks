// CustomPageHandler.js
(function (window, Xrm) {
    // ——————————————————————
    // Core utilities
    // ——————————————————————
    function generateGUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
  
    function makeRecordInactive(recordId) {
      return Xrm.WebApi.updateRecord("cu_custompagescallback", recordId, {
        statuscode: 2,
        statecode: 1,
      });
    }
  
    function fetchCallbackData(sessionId) {
      var fetchXml =
        "<fetch top='1'>" +
          "<entity name='cu_custompagescallback'>" +
            "<attribute name='cu_custompagescallbackid'/>" +
            "<attribute name='createdon'/>" +
            "<attribute name='cu_sessionid'/>" +
            "<attribute name='cu_callbackjson'/>" +
            "<order attribute='createdon' descending='false'/>" +
            "<filter type='and'>" +
              "<condition attribute='cu_sessionid' operator='eq' value='" + sessionId + "'/>" +
            "</filter>" +
          "</entity>" +
        "</fetch>";
  
      return Xrm.WebApi
        .retrieveMultipleRecords("cu_custompagescallback", "?fetchXml=" + encodeURIComponent(fetchXml))
        .then(function (res) {
          if (!res.entities.length) return null;
          var e = res.entities[0];
          return makeRecordInactive(e.cu_custompagescallbackid)
            .then(function () {
              try {
                return JSON.parse(e.cu_callbackjson);
              } catch (err) {
                console.error("Bad JSON in callback record", err);
                return null;
              }
            });
        })
        .catch(function (err) {
          console.error("fetchCallbackData failed", err);
          return null;
        });
    }
  
    // ——————————————————————
    // Core trigger (always uses the callback flow)
    // ——————————————————————
    function triggerCustomPageOpenEvent(
      formContext,
      customPageName,
      navigationOptions,
      callbackFn,
      additionalParameters
    ) {
      additionalParameters = additionalParameters || {};
  
      var recordId  = formContext.data.entity.getId().replace(/[{}]/g, "");
      var tableName = formContext.data.entity.getEntityName();
      var sessionId = generateGUID();
  
      var pageInput = {
        pageType:   "custom",
        name:       customPageName,
        entityName: tableName,
        recordId:   JSON.stringify({
          recordId: recordId,
          sessionId: sessionId,
          additionalParameters: additionalParameters
        })
      };
  
      Xrm.Navigation.navigateTo(pageInput, navigationOptions)
        .then(function () { return fetchCallbackData(sessionId); })
        .then(function (cbData) {
          if (cbData && typeof callbackFn === "function") {
            callbackFn({
              formContext:  formContext,
              callbackData: cbData,
              entityName:   tableName,
              recordId:     recordId
            });
          }
        })
        .catch(function (err) {
          console.error("triggerCustomPageOpenEvent error", err);
        });
    }
  
    // ——————————————————————
    // Public API
    // ——————————————————————
    window.CustomPageHandler = {
      // place your reusable callbacks here:
      callbacks: {},
  
      /**
       * Launch a custom page using the callback flow.
       *
       * @param {object} primaryControl   - Execution context
       * @param {string} callbackKey      - key in callbacks{} (must be defined)
       * @param {string} customPageName   - name of your Custom Page
       * @param {string} navOptsJson      - JSON string for navigationOptions
       * @param {string} extrasJson       - JSON string for additional parameters (optional)
       */
      launch: function (
        primaryControl,
        callbackKey,
        customPageName,
        navOptsJson,
        extrasJson
      ) {
        // parse navigationOptions
        var navOpts;
        try {
          navOpts = JSON.parse(navOptsJson);
        } catch (e) {
          console.error("Invalid JSON for navigationOptions:", e);
          return;
        }
  
        // parse extras
        var extras = {};
        if (extrasJson) {
          try {
            extras = JSON.parse(extrasJson);
          } catch (e) {
            console.warn("Invalid JSON for additionalParameters:", e);
          }
        }
  
        var cb = this.callbacks[callbackKey];
        if (typeof cb !== "function") {
          console.error("No callback registered for key:", callbackKey);
          return;
        }
  
        triggerCustomPageOpenEvent(
          primaryControl,
          customPageName,
          navOpts,
          cb,
          extras
        );
      }
    };
  })(window, Xrm);
  
// after Web Resource loads...
CustomPageHandler.callbacks.myHandler = function(input) {
    // input.formContext, input.callbackData, input.entityName, input.recordId
    // do whatever logic here…
    console.log("Got callback data:", input.callbackData);
  };

//   // after Web Resource loads...
// CustomPageHandler.callbacks.myHandler = async function(input) {
//     // input.formContext, input.callbackData, input.entityName, input.recordId
//     console.log("Got callback data:", input.callbackData);

//     let status = input.callbackData.Status;

//     if (status === "Rejected") {
//         input.formContext.getAttribute("statecode").setValue(1); // Inactive
//         input.formContext.getAttribute("statuscode").setValue(2);
//     } else if (status === "Approved") {
//         input.formContext.getAttribute("statecode").setValue(1); // Inactive
//         input.formContext.getAttribute("statuscode").setValue(865420001);
//     }

//     await input.formContext.data.save();
// };