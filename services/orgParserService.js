/**
* Organization Parser Service
* 
* This service provides functions to parse data from external ERP sources in XML format.
* This file contains an organigram of the departments and eployees of a company,
* which is used to populate the database with the corresponding data.
*/

/**
* Parse the organizational structure from an XML file and extract relevant data.
* @param {string} xmlObj - XML object containing the organizational structure data.
* @returns {Object} An object containing the extracted data from the XML
*/
export async function extractExternalData(xmlObj) {
  try {
    // results and errors detected
    const users = [];
    const departments = [];
    const costCenters = [];
    const errors = [];

    // Principal node of the XML
    const org = xmlObj.Organizacion;

    if (!org) {
      errors.push('Nodo raíz no encontrado en XML');
      return { users, departments, costCenters, errors };
    }

    // Get departments
    // If there is only one department, it will not be an array, so we need to handle both cases
    const departmentsXml = Array.isArray(org.Departamento)
      ? org.Departamento
      : [org.Departamento];

    // Iterate through each department and extract employee data
    departmentsXml.forEach((dept) => {
      const deptName = dept.$.name;
      const deptCostCenter = dept.$.cost_center;

      if (!deptName) {
        errors.push('Departamento con formato incorrecto: falta nombre o centro de costo');
        return;
      }

      // Store department
      departments.push({ department_name: deptName, cost_center_name: deptCostCenter });

      // Store cost centers
      costCenters.push({ cost_center_name: deptCostCenter });

      // Get employees
      const employees = dept.Empleado
        ? Array.isArray(dept.Empleado) ? dept.Empleado : [dept.Empleado]
        : [];
      
      // Iterate through each employee in the department
      employees.forEach((emp) => {
        if (!emp || !emp.$) {
          errors.push(`Empleado con formato incorrecto en departamento ${deptName}`);
          return;
        }

        users.push({
          user_name: emp.$.usuario,
          email: emp.$.correo,
          phone_number: emp.$.telefono || null,
          role: emp.$.rol,
          workstation: emp.$.workstation,
          password: emp.$.password,
          jefe_usuario: emp.$.jefe_usuario || null,
          department_name: deptName,
        });
      });
    });

    return { users, departments, costCenters, errors };
  } catch (error) {
    const errorMessage = 'Error al extraer los datos del XML: ' + error.message;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}