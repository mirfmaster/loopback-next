This example is migrated from
[loopback-example-access-control](https://github.com/strongloop/loopback-example-access-control),
and uses the authentication and authorization system in LoopBack 4 to implement
the access control.

# App Scenario

This example is a donation system. Users can view or make donations to projects
based on their roles. A project is owned by a user, and a user can create a team
to involve other users as team members. The system has an administration.

Here is the diagram that describes the models:

![models](../../imgs/tutorials/access-control-migration/auth_example_scenario_model.png)

And the Project endpoints with their allowed roles:

- /Projects/list-projects
  - everyone
- /Projects/view-all
  - admin
- /Projects/{id}/show-balance
  - owner, teamMember
- /Projects/{id}/donate
  - admin, owner, teamMember
- /Projects/{id}/withdraw
  - owner

The diagram for models also include the pre-created data in this application.

For example, u1 owns project1, it also creates a team with u1 and u2 as members.
Which means u1 is the **owner** of project1, and u1 and u2 are the **team
members** of project1. And u3 is the **admin**.

# Difference

LoopBack 3 has several built-in models that consists of a RBAC system. The
models are User, Role, RoleMapping, ACL, AccessToken. You can learn how they
work together in tutorial
[Controlling data access](https://loopback.io/doc/en/lb3/Controlling-data-access.html).

LoopBack 4 authorization system gives developers the flexibility to implement
the RBAC on their own. You can leverage popular 3rd-party libraries like
[casbin](https://github.com/casbin/casbin) or [oauth0](https://auth0.com/) for
the role mapping.

This guide includes a demo for using [casbin](#steps-with-casbin) and using
[oauth0](#steps-with-oauth0)(TBD)

# Steps with Casbin

Next let's migrate the LoopBack 3 access control example to LoopBack 4. Here is
an overview of the steps:

- Create models (migrates model properties)
- Set up login endpoint (migrate User endpoint)
- Set up project endpoints (migrate Project endpoints)
- Set up authentication (migrate boot/authentication.js)
- Set up authorization (This is the core of the tutorial, migrate role resolvers
  and model acls)
- Seed data (migrate boot/sample-models.js)

## Create models

There are 4 models involved in this example. 3 of them are migrated from
[the original models](https://github.com/strongloop/loopback-example-access-control/tree/master/common/models)
(Project, Team, User). And we add one more model UserCredentials to separate the
sensitive information from the User model.

You can run `lb4 model` to create the 4 models, and run `lb4 repository` to
create their corresponding persistency layer.

_LoopBack 3 model provides 3 layers: data shape, persistency, REST APIs, while
LoopBack 4 model only describes the data shape. Therefore in this section we
also need to create repositories for data persistency. You can read about their
difference in document
[migrating model definitions and built-in APIs](https://loopback.io/doc/en/lb4/migration-models-core.html)_

_To keep the tutorial concise and focus on the core implementation, the detailed
commands are list in the reference [model creation](#model-creation)._

## Set up login endpoint

LoopBack 3 has a default User model with a bunch of pre-defined APIs exposed. In
this example, since we create the User model from scratch, we need to add the
required endpoints in the User controller. In the demo we only need
'User/login'.

This application uses token based authentication. A user logs in by providing
correct credentials (email and password) in the payload of 'User/login', then
gets a token back with its identity information encoded and includes it in the
header of next requests.

To create the login endpoint, we first run `lb4 controller` to create a User
controller (see [user controller creation](#user-controller-creation)). Then add
a new controller function `login` decorated with the REST decorators that
describe the request and response (see
[the complete user controller file](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/controllers/user.controller.ts)).
The core logic of `login` does 3 things:

- call `userService.verifyCredentials()` to verify the credentials and find the
  right user.
- call `userService.convertToUserProfile()` to convert the user into a standard
  principal shared across the authentication and authorization modules.
- call `jwtService.generateToken()` to encode the principal that carries the
  user's identity information into a JSON web token.

To keep the controller file concise and to organize the token and user related
utils, we will create the token service and user service in section
[Set up authentication](#set-up-authentication). Now you can just inject them.

## Set up project endpoints

Next let's create the 5 project endpoints which will be used to demo the access
of different roles. We start from creating a controller for Project (see
[project controller creation](#project-controller-creation)). Then incrementally
add the following endpoints:

- `/project/listProjects`: show all the projects but hide the `balance` field
- `/project/viewAll`: show all the projects with the full information
- `/project/{id}/findById`: show a project's information
- `/projects/{id}/donate`: donate to a project
- `/projects/{id}/withdraw`: withdraw from a project

The complete code can be found in
[src/controller/project.controller.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/controllers/project.controller.ts)

## Set up authentication

This demo uses token based authentication, and uses the jwt authentication
strategy to verify a user's identity. The authentication setup is borrowed from
[loopback4-example-shopping](https://github.com/strongloop/loopback4-example-shopping/tree/master/packages).
The authentication system aims to understand **who sends the request**. It
retrieves the token from a request, decodes the user's information in it as
`principal`, then passes the `principal` to the authorization system which will
decide the `principal`'s access later. You can enable the jwt authentication by:

- create the jwt authentication strategy to decode the user profile from token.
  see
  [file src/services/jwt.auth.strategy.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/services/jwt.auth.strategy.ts)
- create the token service to organize utils for token operations. see
  [file src/services/jwt.service.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/services/jwt.service.ts)
- create user service to organize utils for user operations. see
  [file src/services/user.service.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/services/user.service.ts)
- add OpenAPI security specification to your app so that the explorer has a
  button to setup the token for secured endpoints. see
  [file src/services/security.spec.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/services/security.spec.ts)
- set up bindings for the services and mount the authentication module in the
  application constructor. see
  [the complete application file](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/application.ts)
- decorate the 4 project endpoints (excluding the public `listProjects`) with
  `@authenticate('jwt')`. see example for endpoint
  [viewAll](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/controllers/project.controller.ts#L90)

## Set up authorization

### Background

The authorization system aims to decide given a principal passed from the
authentication system, whether it has access to a resource.

In LoopBack 3, the access control rules for APIs are described by a model
configuration property called 'acls'. In our case they were defined in
[models/project.json](https://github.com/strongloop/loopback-example-access-control/blob/master/common/models/project.json#L21-L61).

For example, the acl for endpoint `/projects/{id}/findById` is:

```
{
  "accessType": "READ",
  "principalType": "ROLE",
  "principalId": "teamMember",
  "permission": "ALLOW",
  "property": "findById"
},
```

It means only team members have access to the resource returned by
`/projects/{id}/findById`. And the authorization system is responsible to figure
out whether a principal is the team member of `project${id}`, which is
considered as role resolving.

### Role Resolving

Role resolving is the core of an RBAC system. In the original application, you
create and register role resolvers to resolve a role at run time. Role `admin`
is defined in
[sample-models.js](https://github.com/strongloop/loopback-example-access-control/blob/master/server/boot/sample-models.js#L62)
and `teamMember` is defined and registered in
[role-resolver](https://github.com/strongloop/loopback-example-access-control/blob/master/server/boot/role-resolver.js).

In the migrated application, we use a 3rd-party library
[casbin](https://github.com/casbin/casbin) to resolve the role.

### Using Casbin

- Overview of casbin

[Casbin](https://casbin.org/docs/en/overview) is a powerful and efficient
open-source access control library. It uses policies to make decisions: whether
a subject can perform an action on a certain object. It enforces the policy in
the classic `{subject, object, action}` form or a customized form as you
defined, both allow and deny authorizations are supported. And it manages the
role-user mappings and role-role mappings (aka role hierarchy in RBAC).

In our example, the casbin system works as a whole to make decisions. The
following diagram explains how the authorization system and casbin system work
together:

![authorization-casbin](../../imgs/tutorials/access-control-migration/auth_example_authorization_casbin.png)

- Model and Policies

If you are not familiar with casbin, you can take a look of the brief summary of
[our usage of casbin](#usage-of-casbin) in the reference.

The Casbin system consists of a model file and policy files. The model file
describes the shape of request, policy, role mapping, and the decision rules.
And to optimize the enforcers, policies are divided into multiple smaller ones
based on roles.

Here is the screenshot for the model file and policy file of role "teamMember",
different colors maps to different concepts:

![casbin-model-policy](../../imgs/tutorials/access-control-migration/auth_example_casbin_model_policy.png)

Based on the screenshot, suppose u2(user with id 2) makes a request to
'/projects/1/donate', the authorization system will send subject as u2, object
as project1, action as donate to casbin. And since u2 inherits role p1_team, and
p1_team can perform donate on project1, casbin system returns allow to the
authorization system.

### Migrating Authorization

First let's migrate the ACLs. The access control information are considered as
authorization metadata, provided in decorator `@authorize()`. Go back the
Project controller file, we can now specify the following fields for each
endpoint:

- resource: the resource name, it's 'project' in this controller
- scopes: it maps to the action in the casbin policy
- allowedRoles: since the casbin system handles the role resolving, this field
  is for optimizing the comparison scope. E.g. when executing the enforcer to
  make decision, only compares with the policies in the admin policy file.

To make the tutorial concise, the code details is omitted here. You can find the
ACLs and how the endpoints are decorated in file
[src/controller/project.controller.ts](https://github.com/strongloop/loopback-next/blob/example/acl-migration/examples/access-control-migration/src/controllers/project.controller.ts)

Then we write the authorizer that calls casbin enforcers to make decision

(Since the PR is still in review, I will update the part when we agree on the
details)

- Create an authorizer that retrieves the authorization metadata from context,
  then execute casbin enforcers to make decision
- Create a voter for instance level endpoints to append the project id to the
  resource name
- Create casbin enforcers
- Write casbin model and policies
- Casbin persistency and synchronize(2nd Phase implementation, TBD)
  - when create a new project
    - create a set of p, project\${id}\_owner, action policies
    - create a set of p, project\${id}\_team, action policies
  - add a new user to a team
    - find the projects owned by the team owner, then create role inherit rules
      g, u${id}, project${id}\_team
  - add a new endpoint(operation)
    - for each of its allowed roles, add p, \${role}, action policy

## Seed Data

The application has pre-created data to try each role's permission. The original
example seeds data in the boot script, now they are migrated to an observer file
called `sample.observer.ts`.

_Since the data are already generated in `db.json`, that observer file is
skipped by default._

## Try Out

(a question for reviewers: do you prefer to see all the screenshots in this
section? To be concise I tend to only describe by words, while if the flow is
not clear enough, I can add pictures)

Start the application:

- Run `npm start` to start the application.
- Open the explorer

Try role 'admin':

- Login as admin first (user Bob)
  - Go to UserController, try endpoint `users/login` with {"email":
    "bob@projects.com", "password": "opensesame"}
  - Get the returned token
  - Click authorize button and paste the token
- Try the 5 endpoints, 'show-balance' and 'withdraw' will return 401, others
  succeed

Try role 'owner':

- Login as owner (user John)
  - Go to UserController, try endpoint `users/login` with {"email":
    "John@projects.com", "password": "opensesame"}
  - Get the returned token
  - Click authorize button and paste the token
- Try the 5 endpoints, 'view-all' will return 401, others succeed

Try role 'team-member':

- Login as team-member (user Jane)
  - Go to UserController, try endpoint `users/login` with {"email":
    "Jane@projects.com", "password": "opensesame"}
  - Get the returned token
  - Click authorize button and paste the token
- Try the 5 endpoints, 'show-balance' and 'donate' will succeed, others returns
  401

## References

### Model Creation

Create User Model

```sh
$ lb4 model
? Model class name: User
? Please select the model base class Entity (A persisted model with an ID)
? Allow additional (free-form) properties? Yes
Model User will be created in src/models/user.model.ts

Lets add a property to User
Enter an empty property name when done

? Enter the property name: id
? Property type: number
? Is id the ID property? Yes
? Is id generated automatically? No
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to User
Enter an empty property name when done

? Enter the property name: username
? Property type: string
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to User
Enter an empty property name when done

? Enter the property name: email
? Property type: string
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to User
Enter an empty property name when done

? Enter the property name:
   create src/models/user.model.ts
   update src/models/index.ts

Model User was created in src/models/
```

Create Team Model

```sh
$ lb4 model
? Model class name: Team
? Please select the model base class Entity (A persisted model with an ID)
? Allow additional (free-form) properties? Yes
Model Team1 will be created in src/models/team.model.ts

Lets add a property to Team
Enter an empty property name when done

? Enter the property name: id
? Property type: number
? Is id the ID property? Yes
? Is id generated automatically? No
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Team
Enter an empty property name when done

? Enter the property name: ownerId
? Property type: number
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Team
Enter an empty property name when done

? Enter the property name: memberIds
? Property type: array
? Type of array items: number
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Team
Enter an empty property name when done

? Enter the property name:
   create src/models/team.model.ts
   update src/models/index.ts

Model Team was created in src/models/
```

Create Project Model

```sh
$ lb4 model
? Model class name: Project
? Please select the model base class Entity (A persisted model with an ID)
? Allow additional (free-form) properties? Yes
Model Project1 will be created in src/models/project.model.ts

Lets add a property to Project
Enter an empty property name when done

? Enter the property name: id
? Property type: number
? Is id the ID property? Yes
? Is id generated automatically? No
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Project
Enter an empty property name when done

? Enter the property name: name
? Property type: string
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Project
Enter an empty property name when done

? Enter the property name: balance
? Property type: number
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to Project
Enter an empty property name when done

? Enter the property name:
   create src/models/project.model.ts
   update src/models/index.ts

Model Project was created in src/models/
```

Create UserCredentials

```sh
$ lb4 model
? Model class name: UserCredentials
? Please select the model base class Entity (A persisted model with an ID)
? Allow additional (free-form) properties? Yes
Model UserCredentials will be created in src/models/user-credentials.model.ts

Lets add a property to UserCredentials
Enter an empty property name when done

? Enter the property name: id
? Property type: number
? Is id the ID property? Yes
? Is id generated automatically? No
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to UserCredentials
Enter an empty property name when done

? Enter the property name: password
? Property type: string
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to UserCredentials
Enter an empty property name when done

? Enter the property name: userId
? Property type: number
? Is it required?: Yes
? Default value [leave blank for none]:

Lets add another property to UserCredentials
Enter an empty property name when done

? Enter the property name:
   create src/models/user-credentials.model.ts
   update src/models/index.ts

Model UserCredentials was created in src/models/
```

Create corresponding repositories

```sh
$ lb4 repository
? Please select the datasource DbDatasource
? Select the model(s) you want to generate a repository Project, Team, UserCredentials, User
? Please select the repository base class DefaultCrudRepository (Legacy juggler bridge)
```

### User Controller Creation

```sh
$ lb4 controller
? Controller class name: User
Controller User will be created in src/controllers/user.controller.ts

? What kind of controller would you like to generate? REST Controller with CRUD functions
? What is the name of the model to use with this CRUD repository? User
? What is the name of your CRUD repository? UserRepository
? What is the name of ID property? id
? What is the type of your ID? number
? Is the id omitted when creating a new instance? No
? What is the base HTTP path name of the CRUD operations? /users
   create src/controllers/user.controller.ts
   update src/controllers/index.ts

Controller User was created in src/controllers/
```

### Project Controller Creation

```sh
$ lb4 controller
? Controller class name: Project
Controller Project will be created in src/controllers/project.controller.ts

? What kind of controller would you like to generate? REST Controller with CRUD functions
? What is the name of the model to use with this CRUD repository? Project
? What is the name of your CRUD repository? ProjectRepository
? What is the name of ID property? id
? What is the type of your ID? number
? Is the id omitted when creating a new instance? No
? What is the base HTTP path name of the CRUD operations? /projects
   create src/controllers/project.controller.ts
   update src/controllers/index.ts

Controller Project was created in src/controllers/
```

### Usage of Casbin

The app has very basic usage of casbin:

- uses a model file to describe the shape of request, policy, role mapping, and
  the decision rules.
  - syntax doc for [casbin models](https://casbin.org/docs/en/syntax-for-models)
  - syntax doc for [casbin role inheritance](https://casbin.org/docs/en/rbac)
  - what is request definition: a set of info collected from the client request.
    In our case: subject, object, operation
  - what is policy definition: who has permission for what. In our case the info
    are same as request: subject, object, operation
  - when make a decision, the casbin enforcer compares the info from request to
    the policies
- uses policy files to store the policies.
  - the casbin docs I post above also contain the policy examples
  - divide policy files into multiple smaller ones based on roles
