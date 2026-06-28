/*************************************************
 SUPABASE CONFIG
*************************************************/

const supabaseUrl =
"https://fakvnhividjbqvjkalty.supabase.co";

const supabaseKey =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha3ZuaGl2aWRqYnF2amthbHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzM3NDAsImV4cCI6MjA5ODE0OTc0MH0.-IEpWTktiHY-mBhPUHB70XKQST3syyUnD4t8YfyOXyg";

const supabaseClient =
window.supabase.createClient(
    supabaseUrl,
    supabaseKey
);

let currentUser = null;
let currentRole = null;

/*************************************************
 AUTH
*************************************************/

async function signUp() {

    const email =
    document.getElementById("email").value;

    const password =
    document.getElementById("password").value;

    const { data, error } =
    await supabaseClient.auth.signUp({
        email,
        password
    });

    if(error){
        alert(error.message);
        return;
    }

    alert(
        "Signup successful. Check email."
    );
}

async function signIn(){

    const email =
    document.getElementById("email").value;

    const password =
    document.getElementById("password").value;

    const { error } =
    await supabaseClient
    .auth
    .signInWithPassword({
        email,
        password
    });

    if(error){
        alert(error.message);
        return;
    }

    checkSession();
}

async function logout(){

    await supabaseClient
    .auth
    .signOut();

    location.reload();
}

/*************************************************
 SESSION
*************************************************/

async function checkSession(){

    const {
        data:{session}
    } =
    await supabaseClient
    .auth
    .getSession();

    if(!session){
        return;
    }

    currentUser =
    session.user;

    document
    .getElementById("authSection")
    .classList
    .add("hidden");

    document
    .getElementById("appSection")
    .classList
    .remove("hidden");

    document
    .getElementById("loggedInUser")
    .innerText =
    session.user.email;

    await loadRole();

    await loadUsersDropdown();

    await loadLeads();

    await loadDashboard();

    if(currentRole === "admin"){
        document
        .getElementById(
            "usersTabButton"
        )
        .classList
        .remove("hidden");

        await loadUsers();
    }

    if(currentRole === "sales_manager"){

        document
        .getElementById(
            "teamTabButton"
        )
        .classList
        .remove("hidden");

        await loadTeam();
    }

}

/*************************************************
 ROLE
*************************************************/

async function loadRole(){

    const { data, error } =
    await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();

    if(error){
        console.error(error);
        return;
    }

    currentRole =
    data.role;
}

/*************************************************
 TABS
*************************************************/

function showTab(tabId){

    document
    .querySelectorAll(
        ".tab-content"
    )
    .forEach(tab=>{

        tab.classList.add(
            "hidden"
        );

    });

    document
    .getElementById(tabId)
    .classList
    .remove("hidden");
}

/*************************************************
 DASHBOARD
*************************************************/

async function loadDashboard(){

    const { data } =
    await supabaseClient
    .from("leads")
    .select("*");

    const total =
    data?.length || 0;

    const won =
    data?.filter(
        x=>x.stage==="Won"
    ).length || 0;

    const lost =
    data?.filter(
        x=>x.stage==="Lost"
    ).length || 0;

    const newLeads =
    data?.filter(
        x=>x.stage==="New Lead"
    ).length || 0;

    document
    .getElementById(
        "totalLeads"
    ).innerText = total;

    document
    .getElementById(
        "wonLeads"
    ).innerText = won;

    document
    .getElementById(
        "lostLeads"
    ).innerText = lost;

    document
    .getElementById(
        "newLeads"
    ).innerText = newLeads;
}

/*************************************************
 USERS DROPDOWN
*************************************************/

async function loadUsersDropdown(){

    const {
        data
    } =
    await supabaseClient
    .from("profiles")
    .select(
        "id,email"
    );

    const dropdown =
    document.getElementById(
        "assignUser"
    );

    dropdown.innerHTML =
    `<option value="">
      Assign User
    </option>`;

    data?.forEach(user=>{

        dropdown.innerHTML += `
        <option value="${user.id}">
            ${user.email}
        </option>
        `;

    });

}

/*************************************************
 ADD LEAD
*************************************************/

async function addLead(){

    const company =
    document.getElementById(
        "company"
    ).value;

    const contact =
    document.getElementById(
        "contact"
    ).value;

    const phone =
    document.getElementById(
        "phone"
    ).value;

    const stage =
    document.getElementById(
        "stage"
    ).value;

    let assignedTo =
    document.getElementById(
        "assignUser"
    ).value;

    if(!assignedTo){
        assignedTo =
        currentUser.id;
    }

    const { error } =
    await supabaseClient
    .from("leads")
    .insert([
        {
            company,
            contact,
            phone,
            stage,
            owner_id:
            currentUser.id,
            assigned_to:
            assignedTo
        }
    ]);

    if(error){
        alert(error.message);
        return;
    }

    await loadLeads();
    await loadDashboard();
}

/*************************************************
 LOAD LEADS
*************************************************/

async function loadLeads(){

    let leads = [];

    if(currentRole === "admin"){

        const { data } =
            await supabaseClient
                .from("leads")
                .select("*");

        leads = data || [];
    }

    else if(currentRole === "sales_manager"){

        const { data: team } =
            await supabaseClient
                .from("profiles")
                .select("id")
                .eq("manager_id", currentUser.id);

        const ids = (team || []).map(x => x.id);
        ids.push(currentUser.id);

        const { data } =
            await supabaseClient
                .from("leads")
                .select("*")
                .in("assigned_to", ids);

        leads = data || [];
    }

    else {

        const { data } =
            await supabaseClient
                .from("leads")
                .select("*")
                .eq("assigned_to", currentUser.id);

        leads = data || [];
    }

    await renderLeads(leads);
}

/*************************************************
 RENDER LEADS
*************************************************/

function renderLeads(leads){

    const tbody =
    document.getElementById(
        "leadsTableBody"
    );

    tbody.innerHTML = "";

    leads.forEach(lead=>{

        let actionBtn = "";

        if(
            currentRole ===
            "admin"
        ){

            actionBtn =
            `<button
             class="delete-btn"
             onclick="deleteLead(${lead.id})">
             Delete
             </button>`;
        }

        tbody.innerHTML += `
        <tr>

            <td>
                ${lead.company || ""}
            </td>

            <td>
                ${lead.contact || ""}
            </td>

            <td>
                ${lead.phone || ""}
            </td>

            <td>
                ${lead.stage || ""}
            </td>

            <td>
                ${lead.assigned_to || ""}
            </td>

            <td>
                ${actionBtn}
            </td>

        </tr>
        `;

    });

}

/*************************************************
 DELETE LEAD
*************************************************/

async function deleteLead(id){

    if(
        currentRole !==
        "admin"
    ){
        return;
    }

    const confirmed =
    confirm(
        "Delete lead?"
    );

    if(!confirmed){
        return;
    }

    await supabaseClient
    .from("leads")
    .delete()
    .eq("id", id);

    await loadLeads();
    await loadDashboard();
}

/*************************************************
 USERS
*************************************************/

async function loadUsers(){

    const {
        data
    } =
    await supabaseClient
    .from("profiles")
    .select("*");

    const tbody =
    document.getElementById(
        "usersTableBody"
    );

    tbody.innerHTML = "";

    data?.forEach(user=>{

        tbody.innerHTML += `
        <tr>

            <td>
                ${user.email}
            </td>

            <td>

                <select
                 id="role_${user.id}">

                    <option
                    ${user.role==="user"?
                    "selected":""}>
                    user
                    </option>

                    <option
                    ${user.role==="sales_manager"?
                    "selected":""}>
                    sales_manager
                    </option>

                    <option
                    ${user.role==="admin"?
                    "selected":""}>
                    admin
                    </option>

                </select>

            </td>

            <td>
                ${user.manager_id || ""}
            </td>

            <td>

                <button
                 class="save-btn"
                 onclick="saveUser('${user.id}')">

                    Save

                </button>

            </td>

        </tr>
        `;

    });

}

async function saveUser(userId){

    const role =
    document.getElementById(
        `role_${userId}`
    ).value;

    const { error } =
    await supabaseClient
    .from("profiles")
    .update({
        role
    })
    .eq(
        "id",
        userId
    );

    if(error){
        alert(error.message);
        return;
    }

    alert(
        "Role updated"
    );
}

/*************************************************
 TEAM
*************************************************/

async function loadTeam(){

    const {
        data
    } =
    await supabaseClient
    .from("profiles")
    .select("*")
    .eq(
        "manager_id",
        currentUser.id
    );

    const tbody =
    document.getElementById(
        "teamTableBody"
    );

    tbody.innerHTML = "";

    data?.forEach(user=>{

        tbody.innerHTML += `
        <tr>

            <td>
                ${user.email}
            </td>

            <td>
                ${user.role}
            </td>

        </tr>
        `;

    });

}

/*************************************************
 START
*************************************************/

checkSession();